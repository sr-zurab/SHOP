from decimal import Decimal
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from discounts.constants import DiscountStatus, DiscountType
from discounts.models import Discount
from discounts.services import (
    DiscountLine,
    calculate_discounts,
)
from shop.models import Category, Product


class DiscountCalculatorBaseTestCase(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="Техника",
            slug="tehnika",
        )

        self.other_category = Category.objects.create(
            name="Карты",
            slug="karty",
        )

        self.product = Product.objects.create(
            category=self.category,
            name="Товар 1",
            slug="product-1",
            price=Decimal("1000.00"),
            stock=10,
            available=True,
        )

        self.other_product = Product.objects.create(
            category=self.other_category,
            name="Товар 2",
            slug="product-2",
            price=Decimal("500.00"),
            stock=10,
            available=True,
        )

        now = timezone.now()

        self.starts_at = now - timedelta(hours=1)
        self.ends_at = now + timedelta(hours=1)

    def make_discount(self, **kwargs):
        defaults = {
            "name": "Тестовая скидка",
            "discount_type": DiscountType.PERCENT,
            "value": Decimal("10.00"),
            "status": DiscountStatus.ACTIVE,
            "starts_at": self.starts_at,
            "ends_at": self.ends_at,
            "priority": 0,
            "is_stackable": False,
        }
        defaults.update(kwargs)

        return Discount.objects.create(**defaults)

    def line(
        self,
        product=None,
        quantity=1,
        unit_price=None,
    ):
        product = product or self.product

        if unit_price is None:
            unit_price = product.price

        return DiscountLine(
            product=product,
            quantity=quantity,
            unit_price=Decimal(unit_price),
            selected_attributes={},
        )


class PercentDiscountTests(DiscountCalculatorBaseTestCase):
    def test_percent_discount(self):
        discount = self.make_discount(
            value=Decimal("10.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    quantity=2,
                    unit_price=Decimal("1000.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.subtotal,
            Decimal("2000.00"),
        )
        self.assertEqual(
            result.discount_total,
            Decimal("200.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("1800.00"),
        )

    def test_percent_discount_with_decimal_price(self):
        discount = self.make_discount(
            value=Decimal("15.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    quantity=3,
                    unit_price=Decimal("199.99"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.subtotal,
            Decimal("599.97"),
        )
        self.assertEqual(
            result.discount_total,
            Decimal("90.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("509.97"),
        )


class FixedDiscountTests(DiscountCalculatorBaseTestCase):
    def test_fixed_discount(self):
        discount = self.make_discount(
            discount_type=DiscountType.FIXED,
            value=Decimal("500.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    unit_price=Decimal("2000.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.discount_total,
            Decimal("500.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("1500.00"),
        )

    def test_fixed_discount_cannot_exceed_applicable_amount(self):
        discount = self.make_discount(
            discount_type=DiscountType.FIXED,
            value=Decimal("500.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    unit_price=Decimal("300.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.discount_total,
            Decimal("300.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("0.00"),
        )


class TargetingTests(DiscountCalculatorBaseTestCase):
    def test_empty_targets_mean_global_discount(self):
        discount = self.make_discount(
            value=Decimal("10.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    product=self.product,
                    unit_price=Decimal("1000.00"),
                ),
                self.line(
                    product=self.other_product,
                    unit_price=Decimal("500.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.subtotal,
            Decimal("1500.00"),
        )
        self.assertEqual(
            result.discount_total,
            Decimal("150.00"),
        )

    def test_product_target(self):
        discount = self.make_discount(
            value=Decimal("10.00"),
        )
        discount.products.add(self.product)

        result = calculate_discounts(
            lines=[
                self.line(
                    product=self.product,
                    unit_price=Decimal("1000.00"),
                ),
                self.line(
                    product=self.other_product,
                    unit_price=Decimal("500.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.subtotal,
            Decimal("1500.00"),
        )
        self.assertEqual(
            result.discount_total,
            Decimal("100.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("1400.00"),
        )

    def test_category_target(self):
        discount = self.make_discount(
            value=Decimal("20.00"),
        )
        discount.categories.add(self.category)

        result = calculate_discounts(
            lines=[
                self.line(
                    product=self.product,
                    unit_price=Decimal("1000.00"),
                ),
                self.line(
                    product=self.other_product,
                    unit_price=Decimal("500.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.discount_total,
            Decimal("200.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("1300.00"),
        )

    def test_product_and_category_target_do_not_double_discount(self):
        discount = self.make_discount(
            value=Decimal("10.00"),
        )
        discount.products.add(self.product)
        discount.categories.add(self.category)

        result = calculate_discounts(
            lines=[
                self.line(
                    product=self.product,
                    unit_price=Decimal("1000.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.discount_total,
            Decimal("100.00"),
        )


class LimitTests(DiscountCalculatorBaseTestCase):
    def test_max_discount_amount(self):
        discount = self.make_discount(
            value=Decimal("50.00"),
            max_discount_amount=Decimal("100.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    unit_price=Decimal("1000.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.discount_total,
            Decimal("100.00"),
        )

    def test_minimum_order_amount(self):
        discount = self.make_discount(
            value=Decimal("10.00"),
            minimum_order_amount=Decimal("2000.00"),
        )

        result = calculate_discounts(
            lines=[
                self.line(
                    unit_price=Decimal("1000.00"),
                ),
            ],
            discounts=[discount],
        )

        self.assertEqual(
            result.discount_total,
            Decimal("0.00"),
        )
        self.assertEqual(
            result.total,
            Decimal("1000.00"),
        )