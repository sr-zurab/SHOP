import json
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework import serializers

from shop.models import (
    Category,
    Product,
    ProductAttribute,
    ProductImage,
)
from shop.serializers import (
    CategorySerializer,
    ProductAttributeSerializer,
    ProductAttributeWriteSerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductWriteSerializer,
    ManagerProductSerializer,
)


class SerializerTestMixin:
    def setUp(self):
        super().setUp()

        self.category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.child_category = Category.objects.create(
            name='Ноутбуки',
            slug='noutbuki',
            parent=self.category,
        )

        self.product = Product.objects.create(
            category=self.child_category,
            name='Ноутбук',
            slug='noutbuk',
            description='Игровой ноутбук',
            price=Decimal('1000.00'),
            stock=5,
            available=True,
        )

    def create_image_file(self, name='test.jpg'):
        image = Image.new(
            'RGB',
            (100, 100),
            'white',
        )

        from io import BytesIO

        buffer = BytesIO()
        image.save(buffer, format='JPEG')
        buffer.seek(0)

        return SimpleUploadedFile(
            name,
            buffer.read(),
            content_type='image/jpeg',
        )

    def get_request(self):
        factory = APIRequestFactory()
        request = factory.get('/api/products/')

        return Request(request)


class CategorySerializerTests(SerializerTestMixin, TestCase):
    def test_serializes_parent(self):
        serializer = CategorySerializer(self.child_category)

        self.assertEqual(
            serializer.data,
            {
                'id': self.child_category.id,
                'name': 'Ноутбуки',
                'slug': 'noutbuki',
                'parent': self.category.id,
            },
        )

    def test_serializes_root_category_with_null_parent(self):
        serializer = CategorySerializer(self.category)

        self.assertIsNone(serializer.data['parent'])

    def test_validates_parent_assignment(self):
        another_category = Category.objects.create(
            name='Одежда',
            slug='odezhda',
        )

        serializer = CategorySerializer(
            instance=self.child_category,
            data={
                'name': 'Ноутбуки',
                'slug': 'noutbuki',
                'parent': another_category.id,
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data['parent'],
            another_category,
        )

    def test_rejects_category_as_its_own_parent(self):
        serializer = CategorySerializer(
            instance=self.category,
            data={
                'name': 'Техника',
                'slug': 'техника',
                'parent': self.category.id,
            },
        )

        self.assertFalse(serializer.is_valid())

        self.assertIn('parent', serializer.errors)
        self.assertIn(
            'Категория не может быть родителем самой себя.',
            str(serializer.errors['parent']),
        )

    def test_rejects_circular_parent_assignment(self):
        grandchild = Category.objects.create(
            name='Игровые',
            slug='igrovye',
            parent=self.child_category,
        )

        serializer = CategorySerializer(
            instance=self.category,
            data={
                'name': 'Техника',
                'slug': 'техника',
                'parent': grandchild.id,
            },
        )

        self.assertFalse(serializer.is_valid())

        self.assertIn('parent', serializer.errors)
        self.assertIn(
            'Нельзя создать циклическую структуру категорий.',
            str(serializer.errors['parent']),
        )

    def test_allows_null_parent(self):
        serializer = CategorySerializer(
            instance=self.child_category,
            data={
                'name': 'Ноутбуки',
                'slug': 'noutbuki',
                'parent': None,
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data['parent'])


class ProductAttributeSerializerTests(SerializerTestMixin, TestCase):
    def test_serializes_attribute(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ProductAttributeSerializer(attribute)

        self.assertEqual(
            serializer.data,
            {
                'id': attribute.id,
                'name': 'Цвет',
                'value': 'Черный',
                'stock': 3,
                'available': True,
                'in_stock': True,
            },
        )

    def test_in_stock_is_false_when_stock_is_zero(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=0,
            available=True,
        )

        serializer = ProductAttributeSerializer(attribute)

        self.assertFalse(serializer.data['in_stock'])

    def test_in_stock_is_false_when_attribute_is_unavailable(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=5,
            available=False,
        )

        serializer = ProductAttributeSerializer(attribute)

        self.assertFalse(serializer.data['in_stock'])


class ProductAttributeWriteSerializerTests(SerializerTestMixin, TestCase):
    def test_validates_attribute_data(self):
        serializer = ProductAttributeWriteSerializer(
            data={
                'name': 'Цвет',
                'value': 'Черный',
                'stock': 5,
                'available': True,
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertEqual(
            serializer.validated_data['name'],
            'Цвет',
        )

    def test_id_is_read_only(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
        )

        serializer = ProductAttributeWriteSerializer(
            attribute,
            data={
                'id': attribute.id + 100,
                'name': 'Цвет',
                'value': 'Белый',
                'stock': 5,
                'available': True,
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn('id', serializer.validated_data)


class ProductListSerializerTests(SerializerTestMixin, TestCase):
    def test_serializes_basic_product_fields(self):
        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertEqual(
            serializer.data['id'],
            self.product.id,
        )
        self.assertEqual(
            serializer.data['name'],
            'Ноутбук',
        )
        self.assertEqual(
            serializer.data['slug'],
            'noutbuk',
        )
        self.assertEqual(
            serializer.data['price'],
            '1000.00',
        )
        self.assertEqual(
            serializer.data['category'],
            'noutbuki',
        )
        self.assertEqual(
            serializer.data['stock'],
            5,
        )

    def test_thumbnail_is_null_without_product_image(self):
        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertIsNone(serializer.data['thumbnail'])

    def test_product_without_attributes_has_attributes_false(self):
        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertFalse(serializer.data['has_attributes'])
        self.assertEqual(
            serializer.data['grouped_attributes'],
            {},
        )

    def test_product_without_attributes_uses_product_stock(self):
        self.product.stock = 5
        self.product.save(update_fields=['stock'])

        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertTrue(serializer.data['in_stock'])

    def test_product_with_attributes_uses_attribute_stock(self):
        self.product.stock = 0
        self.product.save(update_fields=['stock'])

        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertTrue(serializer.data['in_stock'])
        self.assertTrue(serializer.data['has_attributes'])

    def test_product_with_only_zero_stock_attributes_is_out_of_stock(self):
        self.product.stock = 10
        self.product.save(update_fields=['stock'])

        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=0,
            available=True,
        )

        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertFalse(serializer.data['in_stock'])

    def test_grouped_attributes_are_grouped_by_name(self):
        black = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )
        white = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Белый',
            stock=2,
            available=True,
        )
        ram = ProductAttribute.objects.create(
            product=self.product,
            name='ОЗУ',
            value='16 ГБ',
            stock=4,
            available=True,
        )

        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        grouped = serializer.data['grouped_attributes']

        self.assertEqual(
            grouped['Цвет'],
            [
                {
                    'id': black.id,
                    'value': 'Черный',
                    'stock': 3,
                    'available': True,
                    'in_stock': True,
                },
                {
                    'id': white.id,
                    'value': 'Белый',
                    'stock': 2,
                    'available': True,
                    'in_stock': True,
                },
            ],
        )

        self.assertEqual(
            grouped['ОЗУ'],
            [
                {
                    'id': ram.id,
                    'value': '16 ГБ',
                    'stock': 4,
                    'available': True,
                    'in_stock': True,
                },
            ],
        )

    def test_unavailable_attributes_are_not_in_grouped_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
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

        serializer = ProductListSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        grouped = serializer.data['grouped_attributes']

        self.assertEqual(
            len(grouped['Цвет']),
            1,
        )
        self.assertEqual(
            grouped['Цвет'][0]['value'],
            'Черный',
        )


class ProductDetailSerializerTests(SerializerTestMixin, TestCase):
    def test_serializes_category_as_nested_object(self):
        serializer = ProductDetailSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        category = serializer.data['category']

        self.assertEqual(
            category['id'],
            self.child_category.id,
        )
        self.assertEqual(
            category['name'],
            'Ноутбуки',
        )
        self.assertEqual(
            category['slug'],
            'noutbuki',
        )
        self.assertEqual(
            category['parent'],
            self.category.id,
        )

    def test_product_without_image_has_null_image_fields(self):
        serializer = ProductDetailSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertIsNone(serializer.data['main_image'])
        self.assertIsNone(serializer.data['thumbnail'])

    def test_product_without_reviews_has_empty_review_data(self):
        serializer = ProductDetailSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertIsNone(serializer.data['average_rating'])
        self.assertEqual(
            serializer.data['reviews_count'],
            0,
        )

    def test_attributes_are_serialized(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ProductDetailSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertEqual(
            serializer.data['attributes'],
            [
                {
                    'id': attribute.id,
                    'name': 'Цвет',
                    'value': 'Черный',
                    'stock': 3,
                    'available': True,
                    'in_stock': True,
                },
            ],
        )

    def test_unavailable_attributes_are_excluded_from_grouped_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Белый',
            stock=3,
            available=False,
        )

        serializer = ProductDetailSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        grouped = serializer.data['grouped_attributes']

        self.assertEqual(
            [item['value'] for item in grouped['Цвет']],
            ['Черный'],
        )


class ProductWriteSerializerTests(SerializerTestMixin, TestCase):
    def test_creates_product_without_attributes(self):
        serializer = ProductWriteSerializer(
            data={
                'category': self.category.id,
                'name': 'Телефон',
                'slug': 'telefon',
                'description': 'Смартфон',
                'price': '500.00',
                'available': True,
                'stock': 10,
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        self.assertEqual(product.name, 'Телефон')
        self.assertEqual(product.price, Decimal('500.00'))
        self.assertEqual(product.stock, 10)
        self.assertEqual(product.attributes.count(), 0)

    def test_creates_product_with_attributes(self):
        serializer = ProductWriteSerializer(
            data={
                'category': self.category.id,
                'name': 'Телефон',
                'slug': 'telefon',
                'description': 'Смартфон',
                'price': '500.00',
                'available': True,
                'stock': 10,
                'attributes': [
                    {
                        'name': 'Цвет',
                        'value': 'Черный',
                        'stock': 3,
                        'available': True,
                    },
                    {
                        'name': 'Память',
                        'value': '128 ГБ',
                        'stock': 2,
                        'available': True,
                    },
                ],
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        self.assertEqual(
            product.attributes.count(),
            2,
        )

        self.assertTrue(
            product.attributes.filter(
                name='Цвет',
                value='Черный',
                stock=3,
            ).exists()
        )

        self.assertTrue(
            product.attributes.filter(
                name='Память',
                value='128 ГБ',
                stock=2,
            ).exists()
        )

    def test_rejects_duplicate_attributes(self):
        serializer = ProductWriteSerializer(
            data={
                'category': self.category.id,
                'name': 'Телефон',
                'slug': 'telefon',
                'price': '500.00',
                'available': True,
                'stock': 10,
                'attributes': [
                    {
                        'name': 'Цвет',
                        'value': 'Черный',
                        'stock': 3,
                        'available': True,
                    },
                    {
                        'name': 'Цвет',
                        'value': 'Черный',
                        'stock': 5,
                        'available': True,
                    },
                ],
            },
        )

        self.assertFalse(serializer.is_valid())

        self.assertIn(
            'attributes',
            serializer.errors,
        )

        self.assertIn(
            'Для одного товара нельзя добавить два одинаковых '
            'атрибута с одинаковыми названием и значением.',
            str(serializer.errors['attributes']),
        )

    def test_duplicate_detection_ignores_surrounding_whitespace(self):
        serializer = ProductWriteSerializer(
            data={
                'category': self.category.id,
                'name': 'Телефон',
                'slug': 'telefon',
                'price': '500.00',
                'available': True,
                'stock': 10,
                'attributes': [
                    {
                        'name': ' Цвет ',
                        'value': ' Черный ',
                        'stock': 3,
                        'available': True,
                    },
                    {
                        'name': 'Цвет',
                        'value': 'Черный',
                        'stock': 5,
                        'available': True,
                    },
                ],
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            'attributes',
            serializer.errors,
        )

    def test_accepts_attributes_as_json_string(self):
        attributes = [
            {
                'name': 'Цвет',
                'value': 'Черный',
                'stock': 3,
                'available': True,
            },
        ]

        serializer = ProductWriteSerializer(
            data={
                'category': self.category.id,
                'name': 'Телефон',
                'slug': 'telefon',
                'price': '500.00',
                'available': True,
                'stock': 10,
                'attributes': json.dumps(attributes),
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        self.assertEqual(
            product.attributes.count(),
            1,
        )

        attribute = product.attributes.first()

        self.assertEqual(
            attribute.name,
            'Цвет',
        )
        self.assertEqual(
            attribute.value,
            'Черный',
        )

    def test_invalid_attributes_json_becomes_empty_attributes(self):
        serializer = ProductWriteSerializer(
            data={
                'category': self.category.id,
                'name': 'Телефон',
                'slug': 'telefon',
                'price': '500.00',
                'available': True,
                'stock': 10,
                'attributes': 'invalid-json',
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        self.assertEqual(
            product.attributes.count(),
            0,
        )

    def test_update_without_attributes_preserves_existing_attributes(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ProductWriteSerializer(
            instance=self.product,
            data={
                'name': 'Обновленный ноутбук',
                'price': '1200.00',
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        product.refresh_from_db()

        self.assertEqual(
            product.name,
            'Обновленный ноутбук',
        )
        self.assertEqual(
            product.price,
            Decimal('1200.00'),
        )

        self.assertEqual(
            product.attributes.count(),
            1,
        )
        self.assertEqual(
            product.attributes.first().id,
            attribute.id,
        )

    def test_update_with_attributes_replaces_existing_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ProductWriteSerializer(
            instance=self.product,
            data={
                'name': 'Ноутбук',
                'attributes': [
                    {
                        'name': 'Цвет',
                        'value': 'Белый',
                        'stock': 5,
                        'available': True,
                    },
                    {
                        'name': 'ОЗУ',
                        'value': '32 ГБ',
                        'stock': 2,
                        'available': True,
                    },
                ],
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        self.assertEqual(
            product.attributes.count(),
            2,
        )

        self.assertFalse(
            product.attributes.filter(
                value='Черный',
            ).exists()
        )

        self.assertTrue(
            product.attributes.filter(
                name='Цвет',
                value='Белый',
            ).exists()
        )

        self.assertTrue(
            product.attributes.filter(
                name='ОЗУ',
                value='32 ГБ',
            ).exists()
        )

    def test_update_with_empty_attributes_removes_all_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ProductWriteSerializer(
            instance=self.product,
            data={
                'attributes': [],
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        product = serializer.save()

        self.assertEqual(
            product.attributes.count(),
            0,
        )


class ManagerProductSerializerTests(SerializerTestMixin, TestCase):
    def test_serializes_manager_product(self):
        serializer = ManagerProductSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertEqual(
            serializer.data['id'],
            self.product.id,
        )
        self.assertEqual(
            serializer.data['name'],
            'Ноутбук',
        )
        self.assertEqual(
            serializer.data['slug'],
            'noutbuk',
        )
        self.assertEqual(
            serializer.data['price'],
            '1000.00',
        )
        self.assertEqual(
            serializer.data['stock'],
            5,
        )
        self.assertTrue(
            serializer.data['available'],
        )

    def test_manager_serializer_contains_nested_category(self):
        serializer = ManagerProductSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertEqual(
            serializer.data['category']['id'],
            self.child_category.id,
        )
        self.assertEqual(
            serializer.data['category']['parent'],
            self.category.id,
        )

    def test_manager_serializer_contains_attributes(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        serializer = ManagerProductSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertEqual(
            serializer.data['attributes'],
            [
                {
                    'id': attribute.id,
                    'name': 'Цвет',
                    'value': 'Черный',
                    'stock': 3,
                    'available': True,
                    'in_stock': True,
                },
            ],
        )

    def test_manager_serializer_in_stock_uses_attributes(self):
        self.product.stock = 0
        self.product.save(update_fields=['stock'])

        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=2,
            available=True,
        )

        serializer = ManagerProductSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertTrue(
            serializer.data['in_stock'],
        )

    def test_manager_serializer_is_out_of_stock_when_all_attributes_are_empty(self):
        self.product.stock = 10
        self.product.save(update_fields=['stock'])

        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=0,
            available=True,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Белый',
            stock=0,
            available=False,
        )

        serializer = ManagerProductSerializer(
            self.product,
            context={'request': self.get_request()},
        )

        self.assertFalse(
            serializer.data['in_stock'],
        )


class ProductImageSerializerTests(SerializerTestMixin, TestCase):
    def test_serializes_image_fields(self):
        image = ProductImage.objects.create(
            product=self.product,
            image=self.create_image_file(),
            order=0,
        )

        serializer = ProductImageSerializer(
            image,
            context={'request': self.get_request()},
        )

        data = serializer.data

        self.assertEqual(
            data['id'],
            image.id,
        )
        self.assertEqual(
            data['order'],
            0,
        )
        self.assertIsNotNone(data['image'])
        self.assertIsNotNone(data['thumbnail'])

    def test_image_urls_are_absolute_when_request_is_provided(self):
        image = ProductImage.objects.create(
            product=self.product,
            image=self.create_image_file(),
            order=0,
        )

        serializer = ProductImageSerializer(
            image,
            context={'request': self.get_request()},
        )

        self.assertTrue(
            serializer.data['image'].startswith('http://'),
        )
        self.assertTrue(
            serializer.data['thumbnail'].startswith('http://'),
        )