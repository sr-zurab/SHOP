from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from cart.models import Cart, CartItem
from discounts.constants import DiscountStatus, DiscountType
from discounts.models import Discount
from discounts.views import DiscountCalculateAPIView
from shop.models import Category, Product


User = get_user_model()


class DiscountCalculateAPIViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.user = User.objects.create_user(
            username='discount-api-user',
            password='password123',
        )

        self.category = Category.objects.create(
            name='Техника',
            slug='tehnika',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Товар 1',
            slug='tovar-1',
            price=Decimal('1000.00'),
            available=True,
            stock=10,
        )

        self.other_product = Product.objects.create(
            category=self.category,
            name='Товар 2',
            slug='tovar-2',
            price=Decimal('500.00'),
            available=True,
            stock=10,
        )

        self.cart = Cart.objects.create(
            user=self.user,
        )

        self.item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
        )

        self.other_item = CartItem.objects.create(
            cart=self.cart,
            product=self.other_product,
            quantity=1,
        )

        now = timezone.now()

        self.discount = Discount.objects.create(
            name='Скидка 10%',
            discount_type=DiscountType.PERCENT,
            value=Decimal('10.00'),
            status=DiscountStatus.ACTIVE,
            starts_at=now - timezone.timedelta(days=1),
            ends_at=now + timezone.timedelta(days=1),
        )

    def _post(self, data):
        request = self.factory.post(
            '/api/discounts/calculate/',
            data=data,
            format='json',
        )

        force_authenticate(
            request,
            user=self.user,
        )

        response = DiscountCalculateAPIView.as_view()(
            request
        )

        return response

    def test_calculates_discount_for_selected_cart_items(self):
        response = self._post(
            {
                'item_ids': [self.item.id],
            }
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data['subtotal'],
            '2000.00',
        )

        self.assertEqual(
            response.data['discount_total'],
            '200.00',
        )

        self.assertEqual(
            response.data['total'],
            '1800.00',
        )

        self.assertEqual(
            len(response.data['applied_discounts']),
            1,
        )

        self.assertEqual(
            response.data['applied_discounts'][0]['id'],
            self.discount.id,
        )

    def test_calculates_only_selected_items(self):
        response = self._post(
            {
                'item_ids': [self.item.id],
            }
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data['subtotal'],
            '2000.00',
        )

        response = self._post(
            {
                'item_ids': [
                    self.item.id,
                    self.other_item.id,
                ],
            }
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data['subtotal'],
            '2500.00',
        )

        self.assertEqual(
            response.data['discount_total'],
            '250.00',
        )

        self.assertEqual(
            response.data['total'],
            '2250.00',
        )

    def test_rejects_empty_item_ids(self):
        response = self._post(
            {
                'item_ids': [],
            }
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertIn(
            'item_ids',
            response.data,
        )

    def test_rejects_missing_item_ids(self):
        response = self._post({})

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertIn(
            'item_ids',
            response.data,
        )

    def test_rejects_item_not_belonging_to_current_cart(self):
        another_user = User.objects.create_user(
            username='another-user',
            password='password123',
        )

        another_cart = Cart.objects.create(
            user=another_user,
        )

        another_item = CartItem.objects.create(
            cart=another_cart,
            product=self.product,
            quantity=1,
        )

        response = self._post(
            {
                'item_ids': [another_item.id],
            }
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertIn(
            'item_ids',
            response.data,
        )

    def test_does_not_trust_frontend_price(self):
        response = self._post(
            {
                'item_ids': [self.item.id],
                'price': '1.00',
            }
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data['subtotal'],
            '2000.00',
        )

        self.assertEqual(
            response.data['discount_total'],
            '200.00',
        )

        self.assertEqual(
            response.data['total'],
            '1800.00',
        )

    def test_unavailable_discount_is_not_applied(self):
        self.discount.status = DiscountStatus.PAUSED
        self.discount.save(
            update_fields=['status']
        )

        response = self._post(
            {
                'item_ids': [self.item.id],
            }
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data['discount_total'],
            '0.00',
        )

        self.assertEqual(
            response.data['total'],
            '2000.00',
        )

        self.assertEqual(
            response.data['applied_discounts'],
            [],
        )