from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Category, Product


User = get_user_model()


class ProductViewSetEdgeCaseTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username='manager',
            password='test-password',
            is_manager=True,
        )

        self.user = User.objects.create_user(
            username='user',
            password='test-password',
        )

        self.category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Ноутбук',
            slug='noutbuk',
            description='Игровой ноутбук',
            price=Decimal('1000.00'),
            stock=5,
            available=True,
        )

        self.products_url = reverse('product-list')

    def product_detail_url(self, product):
        return reverse(
            'product-detail',
            kwargs={'slug': product.slug},
        )

    def manager_list_url(self):
        return reverse('product-manager-list')

    def test_anonymous_user_can_retrieve_unavailable_product_by_slug(self):
        self.product.available = False
        self.product.save(update_fields=['available'])

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data['id'],
            self.product.id,
        )

    def test_anonymous_user_cannot_create_product(self):
        response = self.client.post(
            self.products_url,
            {
                'category': self.category.id,
                'name': 'Новый товар',
                'slug': 'novyy-tovar',
                'description': 'Описание',
                'price': '100.00',
                'stock': 5,
                'available': True,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_anonymous_user_cannot_update_product(self):
        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'name': 'Изменено',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.product.refresh_from_db()

        self.assertEqual(
            self.product.name,
            'Ноутбук',
        )

    def test_anonymous_user_cannot_delete_product(self):
        response = self.client.delete(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertTrue(
            Product.objects.filter(
                pk=self.product.pk
            ).exists()
        )

    def test_manager_can_delete_product_by_slug(self):
        self.client.force_authenticate(
            user=self.manager
        )

        product_id = self.product.id

        response = self.client.delete(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Product.objects.filter(
                pk=product_id
            ).exists()
        )

    def test_manager_list_returns_unavailable_products_without_filtering_them(self):
        unavailable = Product.objects.create(
            category=self.category,
            name='Недоступный',
            slug='nedostupnyy',
            description='Недоступный товар',
            price=Decimal('500.00'),
            stock=0,
            available=False,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.get(
            self.manager_list_url()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        product_ids = {
            item['id']
            for item in data
        }

        self.assertIn(
            unavailable.id,
            product_ids,
        )

    def test_manager_list_default_order_is_deterministic_by_id(self):
        first = Product.objects.create(
            category=self.category,
            name='Первый',
            slug='pervyy',
            description='Первый',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        second = Product.objects.create(
            category=self.category,
            name='Второй',
            slug='vtoroy',
            description='Второй',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.get(
            self.manager_list_url()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        items = {
            item['id']: item
            for item in data
        }

        self.assertIn(first.id, items)
        self.assertIn(second.id, items)

    def test_price_ascending_uses_id_as_tie_breaker(self):
        first = Product.objects.create(
            category=self.category,
            name='Первый',
            slug='pervyy',
            description='Первый',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        second = Product.objects.create(
            category=self.category,
            name='Второй',
            slug='vtoroy',
            description='Второй',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        response = self.client.get(
            self.products_url,
            {'ordering': 'price_asc'},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        equal_price_ids = [
            item['id']
            for item in data
            if Decimal(str(item['price'])) == Decimal('100.00')
        ]

        self.assertEqual(
            equal_price_ids,
            sorted(equal_price_ids),
        )

        self.assertLess(
            first.id,
            second.id,
        )

    def test_price_descending_uses_id_as_tie_breaker(self):
        first = Product.objects.create(
            category=self.category,
            name='Первый',
            slug='pervyy',
            description='Первый',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        second = Product.objects.create(
            category=self.category,
            name='Второй',
            slug='vtoroy',
            description='Второй',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        response = self.client.get(
            self.products_url,
            {'ordering': 'price_desc'},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        equal_price_ids = [
            item['id']
            for item in data
            if Decimal(str(item['price'])) == Decimal('100.00')
        ]

        self.assertEqual(
            equal_price_ids,
            sorted(equal_price_ids),
        )

    def test_manager_list_supports_price_ordering(self):
        Product.objects.create(
            category=self.category,
            name='Дешёвый',
            slug='deshevyy',
            description='Дешёвый',
            price=Decimal('100.00'),
            stock=1,
            available=True,
        )

        Product.objects.create(
            category=self.category,
            name='Дорогой',
            slug='dorogoy',
            description='Дорогой',
            price=Decimal('2000.00'),
            stock=1,
            available=True,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.get(
            self.manager_list_url(),
            {'ordering': 'price_asc'},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        prices = [
            Decimal(str(item['price']))
            for item in data
        ]

        self.assertEqual(
            prices,
            sorted(prices),
        )

    def test_manager_list_unknown_ordering_falls_back_to_id(self):
        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.get(
            self.manager_list_url(),
            {'ordering': 'unknown'},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        ids = [
            item['id']
            for item in data
        ]

        self.assertEqual(
            ids,
            sorted(ids),
        )


class CategoryViewSetEdgeCaseTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username='manager',
            password='test-password',
            is_manager=True,
        )

        self.user = User.objects.create_user(
            username='user',
            password='test-password',
        )

        self.category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.categories_url = reverse('category-list')

    def category_detail_url(self, category):
        return reverse(
            'category-detail',
            kwargs={'slug': category.slug},
        )

    def test_anonymous_user_can_retrieve_category(self):
        response = self.client.get(
            self.category_detail_url(self.category)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data['id'],
            self.category.id,
        )

    def test_anonymous_user_cannot_create_category(self):
        response = self.client.post(
            self.categories_url,
            {
                'name': 'Одежда',
                'slug': 'odezhda',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_regular_user_cannot_update_category(self):
        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.patch(
            self.category_detail_url(self.category),
            {
                'name': 'Изменено',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.category.refresh_from_db()

        self.assertEqual(
            self.category.name,
            'Техника',
        )

    def test_regular_user_cannot_delete_category(self):
        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.delete(
            self.category_detail_url(self.category)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Category.objects.filter(
                pk=self.category.pk
            ).exists()
        )

    def test_anonymous_user_cannot_delete_category(self):
        response = self.client.delete(
            self.category_detail_url(self.category)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertTrue(
            Category.objects.filter(
                pk=self.category.pk
            ).exists()
        )

    def test_manager_can_update_category_name(self):
        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.patch(
            self.category_detail_url(self.category),
            {
                'name': 'Обновлённая техника',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.category.refresh_from_db()

        self.assertEqual(
            self.category.name,
            'Обновлённая техника',
        )