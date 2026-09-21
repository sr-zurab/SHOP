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
    """

    def __init__(self, lines, discounts, now=None):
        self.lines = tuple(lines)
        self.discounts = tuple(discounts)
        self.now = now or timezone.now()

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
                discount,
                current_total,
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

        for line in self.lines:
            subtotal += (
                Decimal(line.unit_price)
                * Decimal(line.quantity)
            )

        return money(subtotal)

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
                discount,
                line,
            )
            for line in self.lines
        )

    def _line_matches_discount(
        self,
        discount: Discount,
        line: DiscountLine,
    ) -> bool:
        product = line.product

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

        for line in self.lines:
            if self._line_matches_discount(
                discount,
                line,
            ):
                amount += (
                    Decimal(line.unit_price)
                    * Decimal(line.quantity)
                )

        return money(amount)

    def _calculate_discount_amount(
        self,
        discount: Discount,
        current_total: Decimal,
    ) -> Decimal:
        applicable_amount = self._applicable_amount(
            discount
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