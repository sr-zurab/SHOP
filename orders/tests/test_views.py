import threading
import uuid
from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TransactionTestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from cart.models import Cart, CartItem
from discounts.constants import DiscountStatus, DiscountType
from discounts.models import Discount, DiscountUsage
from orders.models import Order

from shop.models import Category, Product


User = get_user_model()


class OrderDiscountIntegrationTests(APITestCase):
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
            name='Тестовый товар',
            slug='test-product',
            price=Decimal('1000.00'),
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

        self.client.force_authenticate(
            user=self.user
        )

    def create_order(
        self,
        client=None,
        cart_item=None,
    ):
        if client is None:
            client = self.client

        if cart_item is None:
            cart_item = self.cart_item

        return client.post(
            reverse('order-list'),
            {
                'selected_item_ids': [
                    cart_item.id,
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

    def test_order_without_discount(self):
        response = self.create_order()

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
            Decimal('0.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('1000.00'),
        )

    def test_percent_discount(self):
        discount = Discount.objects.create(
            name='Скидка 20%',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        response = self.create_order()

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

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount
            ).count(),
            1,
        )

    def test_fixed_discount(self):
        discount = Discount.objects.create(
            name='Фиксированная скидка',
            discount_type=DiscountType.FIXED,
            value=150,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        response = self.create_order()

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
            Decimal('150.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('850.00'),
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount
            ).count(),
            1,
        )

    def test_discount_only_for_selected_product(self):
        another_product = Product.objects.create(
            category=self.category,
            name='Другой товар',
            slug='another-product',
            price=Decimal('500.00'),
            stock=10,
            available=True,
        )

        discount = Discount.objects.create(
            name='Только первый товар',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        discount.products.set([
            self.product,
        ])

        another_cart_item = CartItem.objects.create(
            cart=self.cart,
            product=another_product,
            quantity=1,
            selected_attributes={},
        )

        response = self.client.post(
            reverse('order-list'),
            {
                'selected_item_ids': [
                    self.cart_item.id,
                    another_cart_item.id,
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
            Decimal('1500.00'),
        )

        self.assertEqual(
            order.discount_total,
            Decimal('200.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('1300.00'),
        )

    def test_discount_for_category(self):
        discount = Discount.objects.create(
            name='Скидка категории',
            discount_type=DiscountType.PERCENT,
            value=10,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        discount.categories.set([
            self.category,
        ])

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('100.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('900.00'),
        )

    def test_global_discount(self):
        Discount.objects.create(
            name='Глобальная скидка',
            discount_type=DiscountType.PERCENT,
            value=15,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('150.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('850.00'),
        )

    def test_expired_discount_is_not_applied(self):
        Discount.objects.create(
            name='Завершённая скидка',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(hours=2),
            ends_at=timezone.now() - timedelta(hours=1),
        )

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('0.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('1000.00'),
        )

    def test_paused_discount_is_not_applied(self):
        Discount.objects.create(
            name='Приостановленная скидка',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.PAUSED,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('0.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('1000.00'),
        )

    def test_non_stackable_discount_stops_further_discounts(self):
        Discount.objects.create(
            name='Первая скидка',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            priority=10,
            is_stackable=False,
        )

        Discount.objects.create(
            name='Вторая скидка',
            discount_type=DiscountType.PERCENT,
            value=10,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            priority=5,
            is_stackable=True,
        )

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('200.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('800.00'),
        )

    def test_stackable_discounts_are_applied_sequentially(self):
        Discount.objects.create(
            name='Первая скидка',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            priority=10,
            is_stackable=True,
        )

        Discount.objects.create(
            name='Вторая скидка',
            discount_type=DiscountType.PERCENT,
            value=10,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            priority=5,
            is_stackable=True,
        )

        response = self.create_order()

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
            Decimal('280.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('720.00'),
        )

        self.assertEqual(
            DiscountUsage.objects.count(),
            2,
        )

    def test_discount_max_amount_is_respected(self):
        Discount.objects.create(
            name='Ограниченная скидка',
            discount_type=DiscountType.PERCENT,
            value=50,
            max_discount_amount=Decimal('100.00'),
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('100.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('900.00'),
        )

    def test_minimum_order_amount_is_respected(self):
        Discount.objects.create(
            name='Скидка от суммы',
            discount_type=DiscountType.PERCENT,
            value=20,
            minimum_order_amount=Decimal('1500.00'),
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        response = self.create_order()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        order = Order.objects.get(
            pk=response.data['id']
        )

        self.assertEqual(
            order.discount_total,
            Decimal('0.00'),
        )

        self.assertEqual(
            order.total_price,
            Decimal('1000.00'),
        )

    def test_discount_usage_limit_is_respected(self):
        discount = Discount.objects.create(
            name='Одно использование',
            discount_type=DiscountType.PERCENT,
            value=20,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            usage_limit=1,
        )

        first_response = self.create_order()

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount
            ).count(),
            1,
        )

        new_cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
            selected_attributes={},
        )

        second_client = APIClient()
        second_client.force_authenticate(
            user=self.user
        )

        second_response = self.create_order(
            client=second_client,
            cart_item=new_cart_item,
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_201_CREATED,
        )

        second_order = Order.objects.get(
            pk=second_response.data['id']
        )

        self.assertEqual(
            second_order.discount_total,
            Decimal('0.00'),
        )

        self.assertEqual(
            second_order.total_price,
            Decimal('1000.00'),
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount
            ).count(),
            1,
        )


class ConcurrentOrderDiscountTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.category = Category.objects.create(
            name='Конкурентная категория',
            slug='concurrent-category',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Конкурентный товар',
            slug='concurrent-product',
            price=Decimal('1000.00'),
            stock=10,
            available=True,
        )

    def test_concurrent_checkout_respects_discount_usage_limit(self):
        discount = Discount.objects.create(
            name='Конкурентная скидка',
            discount_type=DiscountType.PERCENT,
            value=50,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            usage_limit=1,
        )

        users = []

        for index in range(2):
            user = User.objects.create_user(
                username=(
                    f'concurrent_{index}_'
                    f'{uuid.uuid4().hex}'
                ),
                password='testpass123',
            )

            cart = Cart.objects.create(
                user=user,
            )

            CartItem.objects.create(
                cart=cart,
                product=self.product,
                quantity=1,
                selected_attributes={},
            )

            users.append(
                (user, cart)
            )

        barrier = threading.Barrier(2)

        results = []
        errors = []
        lock = threading.Lock()

        def checkout(user, cart):
            try:
                connection.close()

                client = APIClient()
                client.force_authenticate(
                    user=user
                )

                cart_item = CartItem.objects.get(
                    cart=cart
                )

                barrier.wait(
                    timeout=10
                )

                response = client.post(
                    reverse('order-list'),
                    {
                        'selected_item_ids': [
                            cart_item.id,
                        ],
                        'delivery_method': (
                            Order.DeliveryMethod.PICKUP
                        ),
                        'full_name': 'Concurrent User',
                        'email': (
                            f'{user.username}'
                            '@example.com'
                        ),
                        'phone': '+79999999999',
                        'address': '',
                    },
                    format='json',
                )

                with lock:
                    results.append(
                        response.status_code
                    )

            except Exception as exc:
                with lock:
                    errors.append(exc)

            finally:
                connection.close()

        threads = [
            threading.Thread(
                target=checkout,
                args=(user, cart),
            )
            for user, cart in users
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join(
                timeout=20
            )

        self.assertFalse(
            errors,
            msg=(
                'Ошибки в потоках: '
                f'{errors}'
            ),
        )

        self.assertEqual(
            len(results),
            2,
        )

        self.assertEqual(
            results.count(
                status.HTTP_201_CREATED
            ),
            2,
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount
            ).count(),
            1,
        )

        discounted_orders = Order.objects.filter(
            discount_total__gt=Decimal('0.00')
        )

        self.assertEqual(
            discounted_orders.count(),
            1,
        )

        non_discounted_orders = Order.objects.filter(
            discount_total=Decimal('0.00')
        )

        self.assertEqual(
            non_discounted_orders.count(),
            1,
        )

    def test_concurrent_checkout_with_global_discount_and_different_products(
        self,
    ):
        second_product = Product.objects.create(
            category=self.category,
            name='Второй конкурентный товар',
            slug='second-concurrent-product',
            price=Decimal('2000.00'),
            stock=10,
            available=True,
        )

        discount = Discount.objects.create(
            name='Глобальная конкурентная скидка',
            discount_type=DiscountType.PERCENT,
            value=10,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
        )

        users = []

        products = [
            self.product,
            second_product,
        ]

        for index, product in enumerate(products):
            user = User.objects.create_user(
                username=(
                    f'global_concurrent_{index}_'
                    f'{uuid.uuid4().hex}'
                ),
                password='testpass123',
            )

            cart = Cart.objects.create(
                user=user,
            )

            CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=1,
                selected_attributes={},
            )

            users.append(
                (user, cart)
            )

        barrier = threading.Barrier(2)

        results = []
        errors = []
        lock = threading.Lock()

        def checkout(user, cart):
            try:
                connection.close()

                client = APIClient()
                client.force_authenticate(
                    user=user
                )

                cart_item = CartItem.objects.get(
                    cart=cart
                )

                barrier.wait(
                    timeout=10
                )

                response = client.post(
                    reverse('order-list'),
                    {
                        'selected_item_ids': [
                            cart_item.id,
                        ],
                        'delivery_method': (
                            Order.DeliveryMethod.PICKUP
                        ),
                        'full_name': 'Global Concurrent User',
                        'email': (
                            f'{user.username}'
                            '@example.com'
                        ),
                        'phone': '+79999999999',
                        'address': '',
                    },
                    format='json',
                )

                with lock:
                    results.append(
                        response.status_code
                    )

            except Exception as exc:
                with lock:
                    errors.append(exc)

            finally:
                connection.close()

        threads = [
            threading.Thread(
                target=checkout,
                args=(user, cart),
            )
            for user, cart in users
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join(
                timeout=20
            )

        self.assertFalse(
            errors,
            msg=(
                'Ошибки в потоках: '
                f'{errors}'
            ),
        )

        self.assertEqual(
            len(results),
            2,
        )

        self.assertEqual(
            results.count(
                status.HTTP_201_CREATED
            ),
            2,
        )

        orders = list(
            Order.objects
            .order_by('id')
        )

        self.assertEqual(
            len(orders),
            2,
        )

        orders_by_subtotal = {
            order.subtotal: order
            for order in orders
        }

        self.assertIn(
            Decimal('1000.00'),
            orders_by_subtotal,
        )

        self.assertIn(
            Decimal('2000.00'),
            orders_by_subtotal,
        )

        first_order = orders_by_subtotal[
            Decimal('1000.00')
        ]

        second_order = orders_by_subtotal[
            Decimal('2000.00')
        ]

        self.assertEqual(
            first_order.discount_total,
            Decimal('100.00'),
        )

        self.assertEqual(
            first_order.total_price,
            Decimal('900.00'),
        )

        self.assertEqual(
            second_order.discount_total,
            Decimal('200.00'),
        )

        self.assertEqual(
            second_order.total_price,
            Decimal('1800.00'),
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount
            ).count(),
            2,
        )

    def test_concurrent_checkout_respects_discount_usage_limit_per_user(
        self,
    ):
        second_product = Product.objects.create(
            category=self.category,
            name='Второй товар пользователя',
            slug='second-user-product',
            price=Decimal('2000.00'),
            stock=10,
            available=True,
        )

        discount = Discount.objects.create(
            name='Скидка одно использование на пользователя',
            discount_type=DiscountType.PERCENT,
            value=10,
            status=DiscountStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(minutes=10),
            ends_at=timezone.now() + timedelta(hours=1),
            usage_limit_per_user=1,
        )

        user = User.objects.create_user(
            username=f'per_user_{uuid.uuid4().hex}',
            password='testpass123',
        )

        cart = Cart.objects.create(
            user=user,
        )

        first_cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
            selected_attributes={},
        )

        second_cart_item = CartItem.objects.create(
            cart=cart,
            product=second_product,
            quantity=1,
            selected_attributes={},
        )

        barrier = threading.Barrier(2)

        results = []
        errors = []
        lock = threading.Lock()

        def checkout(cart_item_id):
            try:
                connection.close()

                client = APIClient()
                client.force_authenticate(
                    user=user
                )

                cart_item = CartItem.objects.get(
                    pk=cart_item_id
                )

                barrier.wait(
                    timeout=10
                )

                response = client.post(
                    reverse('order-list'),
                    {
                        'selected_item_ids': [
                            cart_item.id,
                        ],
                        'delivery_method': (
                            Order.DeliveryMethod.PICKUP
                        ),
                        'full_name': 'Per User Concurrent',
                        'email': (
                            f'{user.username}'
                            '@example.com'
                        ),
                        'phone': '+79999999999',
                        'address': '',
                    },
                    format='json',
                )

                with lock:
                    results.append(
                        (
                            response.status_code,
                            response.data.get('id'),
                        )
                    )

            except Exception as exc:
                with lock:
                    errors.append(exc)

            finally:
                connection.close()

        threads = [
            threading.Thread(
                target=checkout,
                args=(first_cart_item.id,),
            ),
            threading.Thread(
                target=checkout,
                args=(second_cart_item.id,),
            ),
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join(
                timeout=20
            )

        self.assertFalse(
            errors,
            msg=(
                'Ошибки в потоках: '
                f'{errors}'
            ),
        )

        self.assertEqual(
            len(results),
            2,
        )

        self.assertEqual(
            sum(
                result[0] == status.HTTP_201_CREATED
                for result in results
            ),
            2,
        )

        self.assertEqual(
            DiscountUsage.objects.filter(
                discount=discount,
                user=user,
            ).count(),
            1,
        )

        orders = list(
            Order.objects
            .order_by('id')
        )

        self.assertEqual(
            len(orders),
            2,
        )

        discounted_orders = [
            order
            for order in orders
            if order.discount_total > Decimal('0.00')
        ]

        non_discounted_orders = [
            order
            for order in orders
            if order.discount_total == Decimal('0.00')
        ]

        self.assertEqual(
            len(discounted_orders),
            1,
        )

        self.assertEqual(
            len(non_discounted_orders),
            1,
        )

        discounted_order = discounted_orders[0]
        non_discounted_order = non_discounted_orders[0]

        self.assertEqual(
            discounted_order.discount_total,
            Decimal('100.00'),
        )

        self.assertEqual(
            discounted_order.total_price,
            Decimal('900.00'),
        )

        self.assertEqual(
            non_discounted_order.discount_total,
            Decimal('0.00'),
        )

        self.assertEqual(
            non_discounted_order.total_price,
            non_discounted_order.subtotal,
        )

        self.assertIn(
            non_discounted_order.subtotal,
            {
                Decimal('1000.00'),
                Decimal('2000.00'),
            },
        )