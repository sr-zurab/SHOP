from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from cart.models import Cart, CartItem
from discounts.constants import DiscountStatus, DiscountType
from discounts.models import Discount, DiscountUsage
from orders.models import Order
from shop.models import Category, Product


User = get_user_model()


class SelectedItemsCheckoutTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
        )

        self.category = Category.objects.create(
            name='Тестовая категория',
            slug='test-category',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Первый товар',
            slug='first-product',
            price=Decimal('1000.00'),
            stock=10,
            available=True,
        )

        self.another_product = Product.objects.create(
            category=self.category,
            name='Второй товар',
            slug='second-product',
            price=Decimal('2000.00'),
            stock=10,
            available=True,
        )

        self.cart = Cart.objects.create(
            user=self.user,
        )

        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
            selected_attributes={},
        )

        self.another_cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.another_product,
            quantity=1,
            selected_attributes={},
        )

        self.discount = Discount.objects.create(
            name='Скидка только на первый товар',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=(
                timezone.now()
                - timedelta(minutes=10)
            ),
            ends_at=(
                timezone.now()
                + timedelta(hours=1)
            ),
        )

        self.discount.products.set([
            self.product,
        ])

        self.client = APIClient()
        self.client.force_authenticate(
            user=self.user
        )

    def test_checkout_selected_items_only(self):
        response = self.client.post(
            reverse('order-list'),
            {
                'selected_item_ids': [
                    self.cart_item.id,
                ],
                'delivery_method': (
                    Order.DeliveryMethod.PICKUP
                ),
                'full_name': 'Test User',
                'email': 'test@example.com',
                'phone': '+79999999999',
                'address': '',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.subtotal,
            Decimal('1000.00'),
        )

        self.assertEqual(
            order.discount_total,
            Decimal('200.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('800.00'),
        )

        order_items = list(
            order.items.all()
        )

        self.assertEqual(
            len(order_items),
            1,
        )

        self.assertEqual(
            order_items[0].product_id,
            self.product.id,
        )

        self.assertEqual(
            order_items[0].quantity,
            1,
        )

        self.assertFalse(
            CartItem.objects.filter(
                pk=self.cart_item.id
            ).exists()
        )

        self.assertTrue(
            CartItem.objects.filter(
                pk=self.another_cart_item.id
            ).exists()
        )

        self.another_cart_item.refresh_from_db()

        self.assertEqual(
            self.another_cart_item.quantity,
            1,
        )

        self.product.refresh_from_db()
        self.another_product.refresh_from_db()

        self.assertEqual(
            self.product.stock,
            9,
        )

        self.assertEqual(
            self.another_product.stock,
            10,
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=self.discount,
                order=order,
            ).count(),
            1,
        )