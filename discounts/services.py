from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from .constants import DiscountStatus, DiscountType
from .models import Discount


MONEY_QUANT = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(
        MONEY_QUANT,
        rounding=ROUND_HALF_UP,
    )


@dataclass(frozen=True)
class DiscountLine:
    """
    Одна позиция корзины для расчёта скидок.
    """

    product: object
    quantity: int
    unit_price: Decimal
    selected_attributes: dict


@dataclass
class _LineState:
    """
    Внутреннее текущее состояние строки.

    current_amount — текущая стоимость всей строки
    после уже применённых скидок.
    """

    line: DiscountLine
    current_amount: Decimal


@dataclass(frozen=True)
class AppliedDiscount:
    """
    Результат применения одной скидки.
    """

    discount: Discount
    amount: Decimal


@dataclass(frozen=True)
class DiscountCalculation:
    """
    Полный результат расчёта скидок.
    """

    subtotal: Decimal
    discount_total: Decimal
    total: Decimal
    applied_discounts: tuple[AppliedDiscount, ...]


class DiscountCalculator:
    """
    Чистый калькулятор скидок.

    Не изменяет Product, Cart или Order.
    Не создаёт DiscountUsage.
    Не выполняет side effects.

    Stackable-скидки применяются последовательно:
    следующая скидка рассчитывается от текущей стоимости.

    FIXED-скидка применяется один раз за одно применение.
    """

    def __init__(self, lines, discounts, now=None):
        self.lines = tuple(lines)
        self.discounts = tuple(discounts)
        self.now = now or timezone.now()

        self._line_states = [
            _LineState(
                line=line,
                current_amount=money(
                    Decimal(line.unit_price)
                    * Decimal(line.quantity)
                ),
            )
            for line in self.lines
        ]

    def calculate(self) -> DiscountCalculation:
        subtotal = self._calculate_subtotal()

        if subtotal <= Decimal("0.00"):
            return DiscountCalculation(
                subtotal=subtotal,
                discount_total=Decimal("0.00"),
                total=Decimal("0.00"),
                applied_discounts=(),
            )

        current_total = subtotal
        applied = []

        for discount in self._sorted_discounts():
            if not self._is_discount_eligible(
                discount=discount,
                current_total=current_total,
            ):
                continue

            discount_amount = self._calculate_discount_amount(
                discount=discount,
                current_total=current_total,
            )

            if discount_amount <= Decimal("0.00"):
                continue

            discount_amount = min(
                discount_amount,
                current_total,
            )
            discount_amount = money(discount_amount)

            if discount_amount <= Decimal("0.00"):
                continue

            applied.append(
                AppliedDiscount(
                    discount=discount,
                    amount=discount_amount,
                )
            )

            if discount.discount_type == DiscountType.PERCENT:
                self._apply_percent_discount(
                    discount=discount,
                )

            elif discount.discount_type == DiscountType.FIXED:
                self._apply_fixed_discount(
                    discount=discount,
                    discount_amount=discount_amount,
                )

            current_total = money(
                current_total - discount_amount
            )

            if not discount.is_stackable:
                break

            if current_total <= Decimal("0.00"):
                break

        discount_total = money(
            subtotal - current_total
        )

        return DiscountCalculation(
            subtotal=subtotal,
            discount_total=discount_total,
            total=current_total,
            applied_discounts=tuple(applied),
        )

    def _calculate_subtotal(self) -> Decimal:
        subtotal = Decimal("0.00")

        for state in self._line_states:
            subtotal += state.current_amount

        return money(subtotal)

    def _current_total(self) -> Decimal:
        return money(
            sum(
                (
                    state.current_amount
                    for state in self._line_states
                ),
                Decimal("0.00"),
            )
        )

    def _sorted_discounts(self):
        return sorted(
            self.discounts,
            key=lambda discount: (
                -discount.priority,
                -discount.created_at.timestamp(),
                -discount.id,
            ),
        )

    def _is_discount_eligible(
        self,
        discount: Discount,
        current_total: Decimal,
    ) -> bool:
        if discount.status != DiscountStatus.ACTIVE:
            return False

        if not discount.is_time_active(self.now):
            return False

        if (
            discount.minimum_order_amount is not None
            and current_total < discount.minimum_order_amount
        ):
            return False

        return self._has_applicable_lines(discount)

    def _has_applicable_lines(
        self,
        discount: Discount,
    ) -> bool:
        return any(
            self._line_matches_discount(
                discount=discount,
                state=state,
            )
            and state.current_amount > Decimal("0.00")
            for state in self._line_states
        )

    def _line_matches_discount(
        self,
        discount: Discount,
        state: _LineState,
    ) -> bool:
        product = state.line.product

        discount_products = getattr(
            discount,
            "_discount_product_ids",
            None,
        )
        discount_categories = getattr(
            discount,
            "_discount_category_ids",
            None,
        )

        if discount_products is None:
            discount_products = {
                product.pk
                for product in discount.products.all()
            }

        if discount_categories is None:
            discount_categories = {
                category.pk
                for category in discount.categories.all()
            }

        if not discount_products and not discount_categories:
            return True

        if product.pk in discount_products:
            return True

        return product.category_id in discount_categories

    def _applicable_amount(
        self,
        discount: Discount,
    ) -> Decimal:
        amount = Decimal("0.00")

        for state in self._line_states:
            if self._line_matches_discount(
                discount=discount,
                state=state,
            ):
                amount += state.current_amount

        return money(amount)

    def _calculate_discount_amount(
        self,
        discount: Discount,
        current_total: Decimal,
    ) -> Decimal:
        applicable_amount = self._applicable_amount(
            discount=discount,
        )

        if applicable_amount <= Decimal("0.00"):
            return Decimal("0.00")

        if discount.discount_type == DiscountType.PERCENT:
            amount = (
                applicable_amount
                * discount.value
                / Decimal("100")
            )

        elif discount.discount_type == DiscountType.FIXED:
            amount = discount.value

        else:
            return Decimal("0.00")

        if discount.max_discount_amount is not None:
            amount = min(
                amount,
                discount.max_discount_amount,
            )

        return money(
            min(
                amount,
                applicable_amount,
                current_total,
            )
        )

    def _apply_percent_discount(
        self,
        discount: Discount,
    ):
        multiplier = (
            Decimal("1.00")
            - discount.value / Decimal("100")
        )

        for state in self._line_states:
            if not self._line_matches_discount(
                discount=discount,
                state=state,
            ):
                continue

            state.current_amount = money(
                state.current_amount * multiplier
            )

    def _apply_fixed_discount(
        self,
        discount: Discount,
        discount_amount: Decimal,
    ):
        """
        FIXED — одна скидка на всё применимое множество.

        Она не считается отдельно на каждый товар.

        Внутри калькулятора сумма распределяется
        пропорционально между подходящими строками только
        для поддержания корректного состояния строк при
        последующих stackable-скидках.

        Это внутреннее техническое распределение и не является
        отдельной скидкой для каждого товара.
        """

        applicable_states = [
            state
            for state in self._line_states
            if self._line_matches_discount(
                discount=discount,
                state=state,
            )
            and state.current_amount > Decimal("0.00")
        ]

        if not applicable_states:
            return

        applicable_total = money(
            sum(
                (
                    state.current_amount
                    for state in applicable_states
                ),
                Decimal("0.00"),
            )
        )

        if applicable_total <= Decimal("0.00"):
            return

        remaining_discount = discount_amount

        for index, state in enumerate(applicable_states):
            if index == len(applicable_states) - 1:
                line_discount = remaining_discount
            else:
                line_discount = money(
                    discount_amount
                    * state.current_amount
                    / applicable_total
                )

                line_discount = min(
                    line_discount,
                    state.current_amount,
                    remaining_discount,
                )

            state.current_amount = money(
                max(
                    Decimal("0.00"),
                    state.current_amount - line_discount,
                )
            )

            remaining_discount = money(
                remaining_discount - line_discount
            )

            if remaining_discount <= Decimal("0.00"):
                break


def prepare_discounts(discounts):
    """
    Предварительно загружает targets скидок в память.

    Принимает QuerySet или любой iterable со скидками.
    """

    if hasattr(discounts, "prefetch_related"):
        discounts = discounts.prefetch_related(
            "products",
            "categories",
        )

    discounts = list(discounts)

    for discount in discounts:
        discount._discount_product_ids = {
            product.pk
            for product in discount.products.all()
        }
        discount._discount_category_ids = {
            category.pk
            for category in discount.categories.all()
        }

    return discounts


def calculate_discounts(
    lines,
    discounts,
    now=None,
) -> DiscountCalculation:
    """
    Удобная функция-обёртка для расчёта скидок.
    """

    return DiscountCalculator(
        lines=lines,
        discounts=prepare_discounts(discounts),
        now=now,
    ).calculate()