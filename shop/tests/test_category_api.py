from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Category, Product


User = get_user_model()


class CategoryAPITests(APITestCase):
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

        self.categories_url = reverse('category-list')

    def test_list_categories_returns_parent(self):
        parent = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        child = Category.objects.create(
            name='Ноутбуки',
            slug='ноутбуки',
            parent=parent,
        )

        response = self.client.get(self.categories_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.json()

        if 'results' in data:
            data = data['results']

        categories = {
            item['id']: item
            for item in data
        }

        self.assertIsNone(
            categories[parent.id]['parent']
        )

        self.assertEqual(
            categories[child.id]['parent'],
            parent.id,
        )

    def test_manager_can_create_root_category(self):
        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.post(
            self.categories_url,
            {
                'name': 'Техника',
                'slug': 'техника',
                'parent': None,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        category = Category.objects.get(
            slug='техника'
        )

        self.assertIsNone(category.parent_id)

        self.assertEqual(
            response.data['parent'],
            None,
        )

    def test_manager_can_create_child_category(self):
        parent = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.client.force_authenticate(
            user=self.manager
        )

        response = self.client.post(
            self.categories_url,
            {
                'name': 'Ноутбуки',
                'slug': 'ноутбуки',
                'parent': parent.id,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        child = Category.objects.get(
            slug='ноутбуки'
        )

        self.assertEqual(
            child.parent_id,
            parent.id,
        )

        self.assertEqual(
            response.data['parent'],
            parent.id,
        )

    def test_manager_can_change_parent(self):
        first_parent = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        second_parent = Category.objects.create(
            name='Электроника',
            slug='электроника',
        )

        child = Category.objects.create(
            name='Ноутбуки',
            slug='ноутбуки',
            parent=first_parent,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        url = reverse(
            'category-detail',
            kwargs={'slug': child.slug},
        )

        response = self.client.patch(
            url,
            {
                'parent': second_parent.id,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        child.refresh_from_db()

        self.assertEqual(
            child.parent_id,
            second_parent.id,
        )

    def test_category_cannot_be_its_own_parent(self):
        category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        self.client.force_authenticate(
            user=self.manager
        )

        url = reverse(
            'category-detail',
            kwargs={'slug': category.slug},
        )

        response = self.client.patch(
            url,
            {
                'parent': category.id,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        category.refresh_from_db()

        self.assertIsNone(
            category.parent_id
        )

    def test_category_cannot_create_cycle(self):
        root = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        child = Category.objects.create(
            name='Комплектующие',
            slug='комплектующие',
            parent=root,
        )

        grandchild = Category.objects.create(
            name='Видеокарты',
            slug='видеокарты',
            parent=child,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        root_url = reverse(
            'category-detail',
            kwargs={'slug': root.slug},
        )

        response = self.client.patch(
            root_url,
            {
                'parent': grandchild.id,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        root.refresh_from_db()

        self.assertIsNone(
            root.parent_id
        )

    def test_deleting_parent_makes_children_root_categories(self):
        parent = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        child = Category.objects.create(
            name='Ноутбуки',
            slug='ноутбуки',
            parent=parent,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        url = reverse(
            'category-detail',
            kwargs={'slug': parent.slug},
        )

        response = self.client.delete(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        child.refresh_from_db()

        self.assertIsNone(
            child.parent_id
        )

    def test_category_with_product_cannot_be_deleted(self):
        category = Category.objects.create(
            name='Техника',
            slug='техника',
        )

        Product.objects.create(
            category=category,
            name='Ноутбук',
            slug='noutbuk',
            price='1000.00',
            stock=1,
            available=True,
        )

        self.client.force_authenticate(
            user=self.manager
        )

        url = reverse(
            'category-detail',
            kwargs={'slug': category.slug},
        )

        response = self.client.delete(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertTrue(
            Category.objects.filter(
                pk=category.pk
            ).exists()
        )

    def test_regular_user_cannot_create_category(self):
        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.post(
            self.categories_url,
            {
                'name': 'Техника',
                'slug': 'техника',
                'parent': None,
            },
            format='json',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )