from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Category, Product


class CategoryTreeFilterTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.root = Category.objects.create(
            name='Электроника',
            slug='electronics',
        )

        cls.phones = Category.objects.create(
            name='Телефоны',
            slug='phones',
            parent=cls.root,
        )

        cls.smartphones = Category.objects.create(
            name='Смартфоны',
            slug='smartphones',
            parent=cls.phones,
        )

        cls.iphone = Category.objects.create(
            name='iPhone',
            slug='iphone',
            parent=cls.smartphones,
        )

        cls.laptops = Category.objects.create(
            name='Ноутбуки',
            slug='laptops',
            parent=cls.root,
        )

        cls.other_root = Category.objects.create(
            name='Одежда',
            slug='clothes',
        )

        cls.other_child = Category.objects.create(
            name='Обувь',
            slug='shoes',
            parent=cls.other_root,
        )

        cls.root_product = Product.objects.create(
            category=cls.root,
            name='Общий товар',
            slug='root-product',
            price='100.00',
            stock=10,
        )

        cls.phone_product = Product.objects.create(
            category=cls.phones,
            name='Телефон',
            slug='phone-product',
            price='200.00',
            stock=10,
        )

        cls.smartphone_product = Product.objects.create(
            category=cls.smartphones,
            name='Смартфон',
            slug='smartphone-product',
            price='300.00',
            stock=10,
        )

        cls.iphone_product = Product.objects.create(
            category=cls.iphone,
            name='iPhone',
            slug='iphone-product',
            price='400.00',
            stock=10,
        )

        cls.laptop_product = Product.objects.create(
            category=cls.laptops,
            name='Ноутбук',
            slug='laptop-product',
            price='500.00',
            stock=10,
        )

        cls.other_product = Product.objects.create(
            category=cls.other_child,
            name='Обувь',
            slug='shoes-product',
            price='600.00',
            stock=10,
        )

    def get_product_list(self, category_slug):
        url = reverse('product-list')

        return self.client.get(
            url,
            {
                'category': category_slug,
            },
        )

    def get_product_slugs(self, response):
        return {
            product['slug']
            for product in response.data['results']
        }

    def test_root_category_returns_products_from_entire_subtree(self):
        response = self.get_product_list('electronics')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.get_product_slugs(response),
            {
                'root-product',
                'phone-product',
                'smartphone-product',
                'iphone-product',
                'laptop-product',
            },
        )

    def test_middle_category_returns_products_from_all_descendants(self):
        response = self.get_product_list('phones')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.get_product_slugs(response),
            {
                'phone-product',
                'smartphone-product',
                'iphone-product',
            },
        )

    def test_deep_category_returns_products_from_its_subtree(self):
        response = self.get_product_list('smartphones')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.get_product_slugs(response),
            {
                'smartphone-product',
                'iphone-product',
            },
        )

    def test_leaf_category_returns_only_its_products(self):
        response = self.get_product_list('iphone')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.get_product_slugs(response),
            {
                'iphone-product',
            },
        )

    def test_sibling_branch_is_not_included(self):
        response = self.get_product_list('phones')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertNotIn(
            'laptop-product',
            self.get_product_slugs(response),
        )

        self.assertNotIn(
            'shoes-product',
            self.get_product_slugs(response),
        )

    def test_other_root_category_returns_only_its_subtree(self):
        response = self.get_product_list('clothes')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.get_product_slugs(response),
            {
                'shoes-product',
            },
        )

    def test_unavailable_products_remain_excluded(self):
        Product.objects.filter(
            slug='iphone-product',
        ).update(
            available=False,
        )

        response = self.get_product_list('electronics')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertNotIn(
            'iphone-product',
            self.get_product_slugs(response),
        )

    def test_category_without_products_returns_empty_result(self):
        empty_category = Category.objects.create(
            name='Пустая категория',
            slug='empty-category',
            parent=self.root,
        )

        response = self.get_product_list(
            empty_category.slug,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            self.get_product_slugs(response),
            set(),
        )