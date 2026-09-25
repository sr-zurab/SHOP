from decimal import Decimal

from django.test import TestCase

from discounts.constants import DiscountType
from discounts.models import Discount
from discounts.serializers import (
    DiscountCalculateRequestSerializer,
    DiscountCalculationItemSerializer,
    DiscountCalculationSerializer,
)
from discounts.services import AppliedDiscount, DiscountCalculation


class DiscountCalculateRequestSerializerTests(TestCase):
    def test_valid_item_ids(self):
        serializer = DiscountCalculateRequestSerializer(
            data={
                'item_ids': [1, 2, 3],
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data['item_ids'],
            [1, 2, 3],
        )

    def test_item_ids_must_not_be_empty(self):
        serializer = DiscountCalculateRequestSerializer(
            data={
                'item_ids': [],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('item_ids', serializer.errors)

    def test_item_ids_must_be_positive_integers(self):
        serializer = DiscountCalculateRequestSerializer(
            data={
                'item_ids': [1, 0, 3],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('item_ids', serializer.errors)

    def test_item_ids_must_be_integers(self):
        serializer = DiscountCalculateRequestSerializer(
            data={
                'item_ids': [1, 'abc', 3],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('item_ids', serializer.errors)

    def test_item_ids_is_required(self):
        serializer = DiscountCalculateRequestSerializer(
            data={}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('item_ids', serializer.errors)


class DiscountCalculationItemSerializerTests(TestCase):
    def setUp(self):
        self.discount = Discount.objects.create(
            name='Скидка 15%',
            discount_type=DiscountType.PERCENT,
            value=Decimal('15.00'),
            starts_at='2026-01-01T00:00:00Z',
            ends_at='2027-01-01T00:00:00Z',
        )

    def test_serializes_applied_discount(self):
        applied_discount = AppliedDiscount(
            discount=self.discount,
            amount=Decimal('150.00'),
        )

        serializer = DiscountCalculationItemSerializer(
            applied_discount
        )

        self.assertEqual(
            serializer.data,
            {
                'id': self.discount.id,
                'name': 'Скидка 15%',
                'discount_type': 'percent',
                'value': '15.00',
                'amount': '150.00',
            },
        )

    def test_serializes_fixed_discount(self):
        self.discount.discount_type = DiscountType.FIXED
        self.discount.value = Decimal('200.00')
        self.discount.save()

        applied_discount = AppliedDiscount(
            discount=self.discount,
            amount=Decimal('200.00'),
        )

        serializer = DiscountCalculationItemSerializer(
            applied_discount
        )

        self.assertEqual(
            serializer.data['discount_type'],
            'fixed',
        )
        self.assertEqual(
            serializer.data['value'],
            '200.00',
        )
        self.assertEqual(
            serializer.data['amount'],
            '200.00',
        )


class DiscountCalculationSerializerTests(TestCase):
    def setUp(self):
        self.discount = Discount.objects.create(
            name='Скидка 15%',
            discount_type=DiscountType.PERCENT,
            value=Decimal('15.00'),
            starts_at='2026-01-01T00:00:00Z',
            ends_at='2027-01-01T00:00:00Z',
        )

    def test_serializes_calculation_without_discounts(self):
        calculation = DiscountCalculation(
            subtotal=Decimal('1000.00'),
            discount_total=Decimal('0.00'),
            total=Decimal('1000.00'),
            applied_discounts=(),
        )

        serializer = DiscountCalculationSerializer(
            calculation
        )

        self.assertEqual(
            serializer.data,
            {
                'subtotal': '1000.00',
                'discount_total': '0.00',
                'total': '1000.00',
                'applied_discounts': [],
            },
        )

    def test_serializes_calculation_with_discount(self):
        applied_discount = AppliedDiscount(
            discount=self.discount,
            amount=Decimal('150.00'),
        )

        calculation = DiscountCalculation(
            subtotal=Decimal('1000.00'),
            discount_total=Decimal('150.00'),
            total=Decimal('850.00'),
            applied_discounts=(applied_discount,),
        )

        serializer = DiscountCalculationSerializer(
            calculation
        )

        self.assertEqual(
            serializer.data,
            {
                'subtotal': '1000.00',
                'discount_total': '150.00',
                'total': '850.00',
                'applied_discounts': [
                    {
                        'id': self.discount.id,
                        'name': 'Скидка 15%',
                        'discount_type': 'percent',
                        'value': '15.00',
                        'amount': '150.00',
                    }
                ],
            },
        )

    def test_serializes_multiple_applied_discounts(self):
        second_discount = Discount.objects.create(
            name='Фиксированная скидка',
            discount_type=DiscountType.FIXED,
            value=Decimal('50.00'),
            starts_at='2026-01-01T00:00:00Z',
            ends_at='2027-01-01T00:00:00Z',
        )

        applied_first = AppliedDiscount(
            discount=self.discount,
            amount=Decimal('150.00'),
        )

        applied_second = AppliedDiscount(
            discount=second_discount,
            amount=Decimal('50.00'),
        )

        calculation = DiscountCalculation(
            subtotal=Decimal('1000.00'),
            discount_total=Decimal('200.00'),
            total=Decimal('800.00'),
            applied_discounts=(
                applied_first,
                applied_second,
            ),
        )

        serializer = DiscountCalculationSerializer(
            calculation
        )

        self.assertEqual(
            len(serializer.data['applied_discounts']),
            2,
        )

        self.assertEqual(
            serializer.data['applied_discounts'][0]['name'],
            'Скидка 15%',
        )

        self.assertEqual(
            serializer.data['applied_discounts'][1]['name'],
            'Фиксированная скидка',
        )