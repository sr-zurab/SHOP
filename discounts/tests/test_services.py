from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from shop.models import Category, Product

from discounts.constants import DiscountStatus, DiscountType
from discounts.models import Discount
from discounts.services import (
    DiscountLine,
    calculate_discounts,
)


class DiscountCalculatorTests(TestCase):
    def setUp(self):
        self.now = timezone.now()

        self.category = Category.objects.create(
            name='Техника',
            slug='technika',
        )

        self.other_category = Category.objects.create(
            name='Карты',
            slug='cards',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Товар 1',
            slug='product-1',
            price=Decimal('10000.00'),
            stock=100,
            available=True,
        )

        self.product_2 = Product.objects.create(
            category=self.category,
            name='Товар 2',
            slug='product-2',
            price=Decimal('5000.00'),
            stock=100,
            available=True,
        )

        self.product_3 = Product.objects.create(
            category=self.other_category,
            name='Товар 3',
            slug='product-3',
            price=Decimal('3000.00'),
            stock=100,
            available=True,
        )

    def make_line(
        self,
        product,
        price=None,
        quantity=1,
        selected_attributes=None,
    ):
        return DiscountLine(
            product=product,
            quantity=quantity,
            unit_price=(
                price
                if price is not None
                else product.price
            ),
            selected_attributes=(
                selected_attributes or {}
            ),
        )

    def make_discount(
        self,
        *,
        name='Скидка',
        discount_type=DiscountType.PERCENT,
        value='10.00',
        status=DiscountStatus.ACTIVE,
        starts_at=None,
        ends_at=None,
        priority=0,
        is_stackable=False,
        minimum_order_amount=None,
        max_discount_amount=None,
        products=None,
        categories=None,
    ):
        discount = Discount.objects.create(
            name=name,
            description='',
            discount_type=discount_type,
            value=Decimal(value),
            status=status,
            starts_at=(
                starts_at
                or self.now - timedelta(days=1)
            ),
            ends_at=(
                ends_at
                or self.now + timedelta(days=1)
            ),
            priority=priority,
            is_stackable=is_stackable,
            minimum_order_amount=(
                Decimal(minimum_order_amount)
                if minimum_order_amount is not None
                else None
            ),
            max_discount_amount=(
                Decimal(max_discount_amount)
                if max_discount_amount is not None
                else None
            ),
        )

        if products:
            discount.products.set(products)

        if categories:
            discount.categories.set(categories)

        return discount

    def test_percent_discount(self):
        discount = self.make_discount(
            value='20.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.subtotal,
            Decimal('10000.00'),
        )
        self.assertEqual(
            result.discount_total,
            Decimal('2000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('8000.00'),
        )

    def test_fixed_discount_is_applied_once(self):
        discount = self.make_discount(
            discount_type=DiscountType.FIXED,
            value='500.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
                self.make_line(
                    self.product_2,
                    price=Decimal('5000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.subtotal,
            Decimal('15000.00'),
        )
        self.assertEqual(
            result.discount_total,
            Decimal('500.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('14500.00'),
        )

    def test_stackable_percent_discounts_are_sequential(self):
        first = self.make_discount(
            name='20 процентов',
            value='20.00',
            priority=100,
            is_stackable=True,
        )

        second = self.make_discount(
            name='10 процентов',
            value='10.00',
            priority=50,
            is_stackable=True,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[first, second],
            now=self.now,
        )

        # 10000 -> 8000 -> 7200
        self.assertEqual(
            result.discount_total,
            Decimal('2800.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('7200.00'),
        )

    def test_non_stackable_discount_stops_chain(self):
        first = self.make_discount(
            name='20 процентов',
            value='20.00',
            priority=100,
            is_stackable=False,
        )

        second = self.make_discount(
            name='10 процентов',
            value='10.00',
            priority=50,
            is_stackable=True,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[first, second],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('2000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('8000.00'),
        )

        self.assertEqual(
            len(result.applied_discounts),
            1,
        )

    def test_stackable_fixed_discount_is_applied_after_percent(self):
        percent = self.make_discount(
            name='20 процентов',
            value='20.00',
            priority=100,
            is_stackable=True,
        )

        fixed = self.make_discount(
            name='500 рублей',
            discount_type=DiscountType.FIXED,
            value='500.00',
            priority=50,
            is_stackable=True,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[percent, fixed],
            now=self.now,
        )

        # 10000 -> 8000 -> 7500
        self.assertEqual(
            result.discount_total,
            Decimal('2500.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('7500.00'),
        )

    def test_discount_applies_only_to_selected_product(self):
        discount = self.make_discount(
            value='20.00',
            products=[self.product],
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
                self.make_line(
                    self.product_2,
                    price=Decimal('5000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.subtotal,
            Decimal('15000.00'),
        )
        self.assertEqual(
            result.discount_total,
            Decimal('2000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('13000.00'),
        )

    def test_discount_applies_to_category(self):
        discount = self.make_discount(
            value='20.00',
            categories=[self.category],
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
                self.make_line(
                    self.product_2,
                    price=Decimal('5000.00'),
                ),
                self.make_line(
                    self.product_3,
                    price=Decimal('3000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        # Категория "Техника":
        # 10000 + 5000 = 15000
        # 20% = 3000
        self.assertEqual(
            result.subtotal,
            Decimal('18000.00'),
        )
        self.assertEqual(
            result.discount_total,
            Decimal('3000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('15000.00'),
        )

    def test_global_discount_applies_to_all_lines(self):
        discount = self.make_discount(
            value='10.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
                self.make_line(
                    self.product_2,
                    price=Decimal('5000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('1500.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('13500.00'),
        )

    def test_priority_determines_order(self):
        first = self.make_discount(
            name='Первая',
            value='20.00',
            priority=100,
            is_stackable=True,
        )

        second = self.make_discount(
            name='Вторая',
            value='10.00',
            priority=50,
            is_stackable=True,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[second, first],
            now=self.now,
        )

        # Независимо от порядка списка:
        # priority 100 -> priority 50
        # 10000 -> 8000 -> 7200
        self.assertEqual(
            result.total,
            Decimal('7200.00'),
        )

        self.assertEqual(
            result.applied_discounts[0].discount,
            first,
        )
        self.assertEqual(
            result.applied_discounts[1].discount,
            second,
        )

    def test_draft_discount_is_not_applied(self):
        discount = self.make_discount(
            value='20.00',
            status=DiscountStatus.DRAFT,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('10000.00'),
        )

    def test_paused_discount_is_not_applied(self):
        discount = self.make_discount(
            value='20.00',
            status=DiscountStatus.PAUSED,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('10000.00'),
        )

    def test_expired_discount_is_not_applied(self):
        discount = self.make_discount(
            value='20.00',
            starts_at=self.now - timedelta(days=2),
            ends_at=self.now - timedelta(seconds=1),
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('10000.00'),
        )

    def test_future_discount_is_not_applied(self):
        discount = self.make_discount(
            value='20.00',
            starts_at=self.now + timedelta(seconds=1),
            ends_at=self.now + timedelta(days=1),
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('10000.00'),
        )

    def test_start_boundary_is_inclusive(self):
        starts_at = self.now

        discount = self.make_discount(
            value='20.00',
            starts_at=starts_at,
            ends_at=self.now + timedelta(days=1),
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.total,
            Decimal('8000.00'),
        )

    def test_end_boundary_is_exclusive(self):
        ends_at = self.now

        discount = self.make_discount(
            value='20.00',
            starts_at=self.now - timedelta(days=1),
            ends_at=ends_at,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )

        self.assertEqual(
            result.total,
            Decimal('10000.00'),
        )

    def test_max_discount_amount_limits_discount(self):
        discount = self.make_discount(
            value='50.00',
            max_discount_amount='1000.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('1000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('9000.00'),
        )

    def test_minimum_order_amount_allows_discount(self):
        discount = self.make_discount(
            value='20.00',
            minimum_order_amount='10000.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('2000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('8000.00'),
        )

    def test_minimum_order_amount_blocks_discount(self):
        discount = self.make_discount(
            value='20.00',
            minimum_order_amount='10001.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('10000.00'),
        )

    def test_discount_cannot_make_total_negative(self):
        discount = self.make_discount(
            discount_type=DiscountType.FIXED,
            value='20000.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.discount_total,
            Decimal('10000.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('0.00'),
        )

    def test_decimal_rounding(self):
        discount = self.make_discount(
            value='15.00',
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('199.99'),
                    quantity=3,
                ),
            ],
            discounts=[discount],
            now=self.now,
        )

        # 199.99 * 3 = 599.97
        # 599.97 * 15% = 89.9955
        # ROUND_HALF_UP = 90.00
        self.assertEqual(
            result.subtotal,
            Decimal('599.97'),
        )
        self.assertEqual(
            result.discount_total,
            Decimal('90.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('509.97'),
        )

    def test_empty_order(self):
        discount = self.make_discount(
            value='20.00',
        )

        result = calculate_discounts(
            lines=[],
            discounts=[discount],
            now=self.now,
        )

        self.assertEqual(
            result.subtotal,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.discount_total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('0.00'),
        )
        self.assertEqual(
            result.applied_discounts,
            (),
        )

    def test_fixed_discount_then_percent_discount(self):
        fixed = self.make_discount(
            name='500 рублей',
            discount_type=DiscountType.FIXED,
            value='500.00',
            priority=100,
            is_stackable=True,
        )

        percent = self.make_discount(
            name='10 процентов',
            value='10.00',
            priority=50,
            is_stackable=True,
        )

        result = calculate_discounts(
            lines=[
                self.make_line(
                    self.product,
                    price=Decimal('10000.00'),
                ),
            ],
            discounts=[fixed, percent],
            now=self.now,
        )

        # 10000 -> 9500 -> 8550
        self.assertEqual(
            result.discount_total,
            Decimal('1450.00'),
        )
        self.assertEqual(
            result.total,
            Decimal('8550.00'),
        )