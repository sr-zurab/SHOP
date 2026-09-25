from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Category, Product, ProductAttribute


User = get_user_model()


class ProductAPITests(APITestCase):
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
        self.other_category = Category.objects.create(
            name='Одежда',
            slug='одежда',
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

        self.second_product = Product.objects.create(
            category=self.category,
            name='Телефон',
            slug='telefon',
            description='Смартфон',
            price=Decimal('500.00'),
            stock=10,
            available=True,
        )

        self.unavailable_product = Product.objects.create(
            category=self.category,
            name='Недоступный товар',
            slug='nedostupnyy',
            description='Недоступен',
            price=Decimal('700.00'),
            stock=5,
            available=False,
        )

        self.other_category_product = Product.objects.create(
            category=self.other_category,
            name='Футболка',
            slug='futbolka',
            description='Футболка',
            price=Decimal('30.00'),
            stock=20,
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

    def test_anonymous_user_can_list_available_products(self):
        response = self.client.get(self.products_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)
        self.assertIn(self.second_product.id, product_ids)
        self.assertIn(self.other_category_product.id, product_ids)
        self.assertNotIn(self.unavailable_product.id, product_ids)

    def test_anonymous_user_can_retrieve_available_product(self):
        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.product.id)
        self.assertEqual(response.data['name'], 'Ноутбук')
        self.assertEqual(response.data['slug'], 'noutbuk')
        self.assertEqual(
            Decimal(str(response.data['price'])),
            Decimal('1000.00'),
        )

    def test_product_detail_contains_category(self):
        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            response.data['category']['id'],
            self.category.id,
        )
        self.assertEqual(
            response.data['category']['name'],
            'Техника',
        )
        self.assertEqual(
            response.data['category']['slug'],
            'техника',
        )
        self.assertIsNone(response.data['category']['parent'])

    def test_product_list_uses_slug_for_category(self):
        response = self.client.get(
            self.products_url,
            {'category': self.category.slug},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)
        self.assertIn(self.second_product.id, product_ids)
        self.assertNotIn(self.other_category_product.id, product_ids)

    def test_product_list_searches_by_name(self):
        response = self.client.get(
            self.products_url,
            {'search': 'Ноут'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)
        self.assertNotIn(self.second_product.id, product_ids)
        self.assertNotIn(self.other_category_product.id, product_ids)

    def test_product_list_search_is_case_insensitive(self):
        response = self.client.get(
            self.products_url,
            {'search': 'НОУТ'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)

    def test_product_list_price_ascending(self):
        response = self.client.get(
            self.products_url,
            {'ordering': 'price_asc'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        prices = [
            Decimal(str(item['price']))
            for item in data
        ]

        self.assertEqual(prices, sorted(prices))

    def test_product_list_price_descending(self):
        response = self.client.get(
            self.products_url,
            {'ordering': 'price_desc'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        prices = [
            Decimal(str(item['price']))
            for item in data
        ]

        self.assertEqual(
            prices,
            sorted(prices, reverse=True),
        )

    def test_product_list_newest_ordering(self):
        response = self.client.get(
            self.products_url,
            {'ordering': 'newest'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            data = data['results']

        self.assertGreaterEqual(len(data), 2)
        self.assertEqual(data[0]['id'], self.other_category_product.id)

    def test_product_list_ignores_unknown_ordering(self):
        response = self.client.get(
            self.products_url,
            {'ordering': 'unknown'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_create_product(self):
        self.client.force_authenticate(user=self.user)

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
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            Product.objects.filter(slug='novyy-tovar').exists()
        )

    def test_manager_can_create_product(self):
        self.client.force_authenticate(user=self.manager)

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
            status.HTTP_201_CREATED,
        )

        product = Product.objects.get(slug='novyy-tovar')

        self.assertEqual(product.category_id, self.category.id)
        self.assertEqual(product.name, 'Новый товар')
        self.assertEqual(product.price, Decimal('100.00'))
        self.assertEqual(product.stock, 5)
        self.assertTrue(product.available)

    def test_manager_can_update_product(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'name': 'Обновлённый ноутбук',
                'price': '1200.00',
                'stock': 7,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.product.refresh_from_db()

        self.assertEqual(
            self.product.name,
            'Обновлённый ноутбук',
        )
        self.assertEqual(
            self.product.price,
            Decimal('1200.00'),
        )
        self.assertEqual(
            self.product.stock,
            7,
        )

    def test_manager_can_change_product_category(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'category': self.other_category.id,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.product.refresh_from_db()

        self.assertEqual(
            self.product.category_id,
            self.other_category.id,
        )

    def test_manager_can_change_product_availability(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'available': False,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.product.refresh_from_db()

        self.assertFalse(self.product.available)

    def test_manager_can_delete_product(self):
        self.client.force_authenticate(user=self.manager)

        product_id = self.product.id

        response = self.client.delete(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Product.objects.filter(pk=product_id).exists()
        )

    def test_regular_user_cannot_update_product(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'name': 'Изменено',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.product.refresh_from_db()

        self.assertEqual(
            self.product.name,
            'Ноутбук',
        )

    def test_regular_user_cannot_delete_product(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Product.objects.filter(pk=self.product.id).exists()
        )

    def test_manager_list_requires_manager(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.manager_list_url()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_manager_can_get_manager_list(self):
        self.client.force_authenticate(user=self.manager)

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

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)
        self.assertIn(
            self.unavailable_product.id,
            product_ids,
        )

    def test_manager_list_contains_unavailable_products(self):
        self.client.force_authenticate(user=self.manager)

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

        unavailable = next(
            item
            for item in data
            if item['id'] == self.unavailable_product.id
        )

        self.assertFalse(unavailable['available'])

    def test_product_without_attributes_uses_product_stock(self):
        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['in_stock'])
        self.assertEqual(response.data['stock'], 5)

    def test_product_with_attributes_is_in_stock_when_attribute_has_stock(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        self.product.refresh_from_db()

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['in_stock'])

    def test_product_with_attributes_is_out_of_stock_when_no_attribute_has_stock(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=0,
            available=True,
        )

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['in_stock'])

    def test_product_detail_contains_grouped_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Белый',
            stock=0,
            available=True,
        )
        ProductAttribute.objects.create(
            product=self.product,
            name='Память',
            value='16 GB',
            stock=2,
            available=True,
        )

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        grouped = response.data['grouped_attributes']

        self.assertIn('Цвет', grouped)
        self.assertIn('Память', grouped)

        colors = {
            item['value']: item
            for item in grouped['Цвет']
        }

        self.assertEqual(colors['Чёрный']['stock'], 3)
        self.assertTrue(colors['Чёрный']['in_stock'])

        self.assertEqual(colors['Белый']['stock'], 0)
        self.assertFalse(colors['Белый']['in_stock'])

    def test_unavailable_attributes_are_not_in_grouped_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Красный',
            stock=5,
            available=False,
        )

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        grouped = response.data['grouped_attributes']

        self.assertIn('Цвет', grouped)

        values = {
            item['value']
            for item in grouped['Цвет']
        }

        self.assertIn('Чёрный', values)
        self.assertNotIn('Красный', values)

    def test_manager_product_list_contains_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        self.client.force_authenticate(user=self.manager)

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

        product_data = next(
            item
            for item in data
            if item['id'] == self.product.id
        )

        self.assertEqual(
            len(product_data['attributes']),
            1,
        )

        self.assertEqual(
            product_data['attributes'][0]['name'],
            'Цвет',
        )

    def test_product_can_be_created_with_attributes(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            self.products_url,
            {
                'category': self.category.id,
                'name': 'Ноутбук с параметрами',
                'slug': 'noutbuk-s-parametrami',
                'description': 'Описание',
                'price': '1500.00',
                'stock': 0,
                'available': True,
                'attributes': [
                    {
                        'name': 'Цвет',
                        'value': 'Чёрный',
                        'stock': 3,
                        'available': True,
                    },
                    {
                        'name': 'Цвет',
                        'value': 'Белый',
                        'stock': 2,
                        'available': True,
                    },
                    {
                        'name': 'Память',
                        'value': '16 GB',
                        'stock': 4,
                        'available': True,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        product = Product.objects.get(
            slug='noutbuk-s-parametrami'
        )

        attributes = list(
            product.attributes.order_by('id').values(
                'name',
                'value',
                'stock',
                'available',
            )
        )

        self.assertEqual(
            attributes,
            [
                {
                    'name': 'Цвет',
                    'value': 'Чёрный',
                    'stock': 3,
                    'available': True,
                },
                {
                    'name': 'Цвет',
                    'value': 'Белый',
                    'stock': 2,
                    'available': True,
                },
                {
                    'name': 'Память',
                    'value': '16 GB',
                    'stock': 4,
                    'available': True,
                },
            ],
        )

    def test_product_update_replaces_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'attributes': [
                    {
                        'name': 'Цвет',
                        'value': 'Белый',
                        'stock': 5,
                        'available': True,
                    },
                    {
                        'name': 'Память',
                        'value': '32 GB',
                        'stock': 2,
                        'available': True,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        attributes = list(
            self.product.attributes.order_by('id').values(
                'name',
                'value',
                'stock',
                'available',
            )
        )

        self.assertEqual(
            attributes,
            [
                {
                    'name': 'Цвет',
                    'value': 'Белый',
                    'stock': 5,
                    'available': True,
                },
                {
                    'name': 'Память',
                    'value': '32 GB',
                    'stock': 2,
                    'available': True,
                },
            ],
        )

    def test_product_update_without_attributes_does_not_delete_existing_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'name': 'Обновлённый ноутбук',
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            ProductAttribute.objects.filter(
                product=self.product,
                name='Цвет',
                value='Чёрный',
            ).exists()
        )

    def test_duplicate_product_attribute_is_rejected(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'attributes': [
                    {
                        'name': 'Цвет',
                        'value': 'Чёрный',
                        'stock': 5,
                        'available': True,
                    },
                    {
                        'name': 'Цвет',
                        'value': 'Чёрный',
                        'stock': 2,
                        'available': True,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_product_detail_returns_attributes(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        attributes = response.data['attributes']

        self.assertEqual(len(attributes), 1)
        self.assertEqual(attributes[0]['id'], attribute.id)
        self.assertEqual(attributes[0]['name'], 'Цвет')
        self.assertEqual(attributes[0]['value'], 'Чёрный')
        self.assertEqual(attributes[0]['stock'], 3)
        self.assertTrue(attributes[0]['available'])
        self.assertTrue(attributes[0]['in_stock'])

    def test_product_list_contains_has_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        response = self.client.get(
            self.products_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_data = next(
            item
            for item in data
            if item['id'] == self.product.id
        )

        product_without_attributes = next(
            item
            for item in data
            if item['id'] == self.second_product.id
        )

        self.assertTrue(
            product_data['has_attributes']
        )
        self.assertFalse(
            product_without_attributes['has_attributes']
        )

    def test_product_list_contains_grouped_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Чёрный',
            stock=3,
            available=True,
        )

        response = self.client.get(
            self.products_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_data = next(
            item
            for item in data
            if item['id'] == self.product.id
        )

        self.assertIn(
            'Цвет',
            product_data['grouped_attributes'],
        )

        self.assertEqual(
            product_data['grouped_attributes']['Цвет'][0]['value'],
            'Чёрный',
        )

    def test_product_with_zero_stock_is_out_of_stock_without_attributes(self):
        self.product.stock = 0
        self.product.save(update_fields=['stock'])

        response = self.client.get(
            self.product_detail_url(self.product)
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertFalse(response.data['in_stock'])

    def test_product_list_exposes_stock(self):
        response = self.client.get(
            self.products_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_data = next(
            item
            for item in data
            if item['id'] == self.product.id
        )

        self.assertEqual(
            product_data['stock'],
            5,
        )

    def test_product_detail_returns_404_for_unknown_slug(self):
        response = self.client.get(
            reverse(
                'product-detail',
                kwargs={'slug': 'does-not-exist'},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_regular_user_cannot_access_manager_list(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            self.manager_list_url()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_anonymous_user_cannot_access_manager_list(self):
        response = self.client.get(
            self.manager_list_url()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_manager_list_supports_search(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(
            self.manager_list_url(),
            {'search': 'Ноут'},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)
        self.assertNotIn(self.second_product.id, product_ids)

    def test_manager_list_supports_category_filter(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(
            self.manager_list_url(),
            {'category': self.category.slug},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()
        if 'results' in data:
            data = data['results']

        product_ids = {item['id'] for item in data}

        self.assertIn(self.product.id, product_ids)
        self.assertIn(self.second_product.id, product_ids)
        self.assertNotIn(
            self.other_category_product.id,
            product_ids,
        )