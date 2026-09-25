from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from shop.models import Category, Product, ProductAttribute, ProductImage


class CategoryModelTests(TestCase):

    def test_category_can_be_created_without_parent(self):
        category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.assertIsNone(category.parent)
        self.assertEqual(str(category), 'Техника')

    def test_category_can_have_parent(self):
        parent = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        child = Category.objects.create(
            name='Ноутбуки',
            slug='noutbuki',
            parent=parent,
        )

        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())

    def test_category_cannot_be_its_own_parent(self):
        category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        category.parent = category

        with self.assertRaises(ValidationError):
            category.full_clean()

    def test_category_cannot_create_circular_structure(self):
        root = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        child = Category.objects.create(
            name='Комплектующие',
            slug='komplektuyushchie',
            parent=root,
        )

        grandchild = Category.objects.create(
            name='Видеокарты',
            slug='videokarty',
            parent=child,
        )

        root.parent = grandchild

        with self.assertRaises(ValidationError):
            root.full_clean()

    def test_category_parent_can_be_changed_without_creating_cycle(self):
        first_root = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        second_root = Category.objects.create(
            name='Одежда',
            slug='одежда',
        )

        child = Category.objects.create(
            name='Ноутбуки',
            slug='noutbuki',
            parent=first_root,
        )

        child.parent = second_root
        child.full_clean()
        child.save()

        child.refresh_from_db()

        self.assertEqual(
            child.parent,
            second_root,
        )

    def test_deleting_parent_category_sets_children_parent_to_null(self):
        parent = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        child = Category.objects.create(
            name='Ноутбуки',
            slug='noutbuki',
            parent=parent,
        )

        grandchild = Category.objects.create(
            name='Игровые',
            slug='igrovye',
            parent=child,
        )

        parent.delete()

        child.refresh_from_db()
        grandchild.refresh_from_db()

        self.assertIsNone(child.parent)
        self.assertEqual(grandchild.parent, child)


class ProductModelTests(TestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

    def create_product(self):
        return Product.objects.create(
            category=self.category,
            name='Ноутбук',
            slug='noutbuk',
            description='Игровой ноутбук',
            price=Decimal('1000.00'),
            stock=5,
            available=True,
        )

    def test_product_can_be_created(self):
        product = self.create_product()

        self.assertEqual(str(product), 'Ноутбук')
        self.assertEqual(product.category, self.category)
        self.assertEqual(product.price, Decimal('1000.00'))
        self.assertEqual(product.stock, 5)
        self.assertTrue(product.available)

    def test_product_category_is_protected_from_deletion(self):
        self.create_product()

        with self.assertRaises(Exception):
            self.category.delete()

        self.assertTrue(
            Product.objects.filter(
                category=self.category,
            ).exists()
        )

    def test_product_slug_is_unique(self):
        self.create_product()

        with self.assertRaises(IntegrityError):
            Product.objects.create(
                category=self.category,
                name='Другой ноутбук',
                slug='noutbuk',
                price=Decimal('1200.00'),
                stock=1,
            )


class ProductAttributeModelTests(TestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Ноутбук',
            slug='noutbuk',
            price=Decimal('1000.00'),
            stock=5,
            available=True,
        )

    def test_attribute_in_stock_when_available_and_stock_positive(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        self.assertTrue(attribute.in_stock)

    def test_attribute_is_not_in_stock_when_stock_zero(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=0,
            available=True,
        )

        self.assertFalse(attribute.in_stock)

    def test_attribute_is_not_in_stock_when_unavailable(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=False,
        )

        self.assertFalse(attribute.in_stock)

    def test_attribute_string_representation(self):
        attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        self.assertEqual(
            str(attribute),
            'Ноутбук — Цвет: Черный',
        )

    def test_duplicate_attribute_for_same_product_is_rejected(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
            available=True,
        )

        with self.assertRaises(IntegrityError):
            ProductAttribute.objects.create(
                product=self.product,
                name='Цвет',
                value='Черный',
                stock=5,
                available=True,
            )

    def test_same_attribute_can_exist_for_different_products(self):
        second_product = Product.objects.create(
            category=self.category,
            name='Телефон',
            slug='telefon',
            price=Decimal('500.00'),
            stock=10,
            available=True,
        )

        first_attribute = ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
        )

        second_attribute = ProductAttribute.objects.create(
            product=second_product,
            name='Цвет',
            value='Черный',
            stock=4,
        )

        self.assertNotEqual(
            first_attribute.id,
            second_attribute.id,
        )

    def test_deleting_product_deletes_attributes(self):
        ProductAttribute.objects.create(
            product=self.product,
            name='Цвет',
            value='Черный',
            stock=3,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='ОЗУ',
            value='16 ГБ',
            stock=2,
        )

        self.product.delete()

        self.assertEqual(
            ProductAttribute.objects.count(),
            0,
        )


class ProductImageModelTests(TestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Ноутбук',
            slug='noutbuk',
            price=Decimal('1000.00'),
            stock=5,
            available=True,
        )

    def test_image_can_be_created_for_product(self):
        image = ProductImage.objects.create(
            product=self.product,
            image='products/test/image.jpg',
            order=2,
        )

        self.assertEqual(
            image.product,
            self.product,
        )

        self.assertEqual(
            image.order,
            2,
        )

        self.assertIn(
            'Ноутбук',
            str(image),
        )

    def test_images_are_ordered_by_order(self):
        third = ProductImage.objects.create(
            product=self.product,
            image='products/test/third.jpg',
            order=2,
        )

        first = ProductImage.objects.create(
            product=self.product,
            image='products/test/first.jpg',
            order=0,
        )

        second = ProductImage.objects.create(
            product=self.product,
            image='products/test/second.jpg',
            order=1,
        )

        images = list(
            ProductImage.objects.filter(
                product=self.product,
            )
        )

        self.assertEqual(
            images,
            [
                first,
                second,
                third,
            ],
        )

    def test_deleting_product_deletes_images(self):
        ProductImage.objects.create(
            product=self.product,
            image='products/test/first.jpg',
            order=0,
        )

        ProductImage.objects.create(
            product=self.product,
            image='products/test/second.jpg',
            order=1,
        )

        self.assertEqual(
            ProductImage.objects.count(),
            2,
        )

        self.product.delete()

        self.assertEqual(
            ProductImage.objects.count(),
            0,
        )