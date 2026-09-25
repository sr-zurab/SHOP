from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Category, Product, ProductImage


User = get_user_model()


class ProductImageAPITests(APITestCase):

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

    def create_test_image(self, name='test.jpg'):
        image = Image.new(
            'RGB',
            (100, 100),
            'white',
        )

        image_io = BytesIO()
        image.save(
            image_io,
            format='JPEG',
        )
        image_io.seek(0)

        return SimpleUploadedFile(
            name,
            image_io.read(),
            content_type='image/jpeg',
        )

    def test_manager_can_create_product_with_gallery_images(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            self.products_url,
            {
                'category': self.category.id,
                'name': 'Новый ноутбук',
                'slug': 'novyy-noutbuk',
                'description': 'Новый товар',
                'price': '1500.00',
                'stock': 10,
                'available': True,
                'gallery_images': [
                    self.create_test_image('first.jpg'),
                    self.create_test_image('second.jpg'),
                ],
            },
            format='multipart',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        product = Product.objects.get(
            slug='novyy-noutbuk',
        )

        images = list(
            ProductImage.objects.filter(
                product=product,
            ).order_by('order')
        )

        self.assertEqual(
            len(images),
            2,
        )

        self.assertEqual(
            images[0].order,
            0,
        )
        self.assertEqual(
            images[1].order,
            1,
        )

        self.assertTrue(images[0].image)
        self.assertTrue(images[1].image)

    def test_gallery_images_are_returned_in_product_detail(self):
        first_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('first.jpg'),
            order=0,
        )

        second_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('second.jpg'),
            order=1,
        )

        response = self.client.get(
            self.product_detail_url(self.product),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            'images',
            response.data,
        )

        images = response.data['images']

        self.assertEqual(
            len(images),
            2,
        )

        self.assertEqual(
            images[0]['id'],
            first_image.id,
        )

        self.assertEqual(
            images[0]['order'],
            0,
        )

        self.assertEqual(
            images[1]['id'],
            second_image.id,
        )

        self.assertEqual(
            images[1]['order'],
            1,
        )

        self.assertTrue(images[0]['image'])
        self.assertTrue(images[0]['thumbnail'])

    def test_gallery_images_are_ordered_by_order(self):
        third_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('third.jpg'),
            order=2,
        )

        first_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('first.jpg'),
            order=0,
        )

        second_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('second.jpg'),
            order=1,
        )

        response = self.client.get(
            self.product_detail_url(self.product),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        images = response.data['images']

        self.assertEqual(
            [image['id'] for image in images],
            [
                first_image.id,
                second_image.id,
                third_image.id,
            ],
        )

    def test_manager_can_add_gallery_images_when_updating_product(self):
        existing_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('existing.jpg'),
            order=0,
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'gallery_images': [
                    self.create_test_image('new.jpg'),
                ],
            },
            format='multipart',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        images = list(
            ProductImage.objects.filter(
                product=self.product,
            ).order_by('id')
        )

        self.assertEqual(
            len(images),
            2,
        )

        self.assertEqual(
            images[0].id,
            existing_image.id,
        )

        self.assertEqual(
            images[0].order,
            0,
        )

        self.assertEqual(
            images[1].order,
            0,
        )

    def test_updating_product_without_gallery_images_preserves_existing_images(self):
        first_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('first.jpg'),
            order=0,
        )

        second_image = ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('second.jpg'),
            order=1,
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'name': 'Обновленный ноутбук',
            },
            format='multipart',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        images = list(
            ProductImage.objects.filter(
                product=self.product,
            ).order_by('order')
        )

        self.assertEqual(
            len(images),
            2,
        )

        self.assertEqual(
            images[0].id,
            first_image.id,
        )

        self.assertEqual(
            images[1].id,
            second_image.id,
        )

    def test_regular_user_cannot_add_gallery_images(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'gallery_images': [
                    self.create_test_image('forbidden.jpg'),
                ],
            },
            format='multipart',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            ProductImage.objects.filter(
                product=self.product,
            ).count(),
            0,
        )

    def test_anonymous_user_cannot_add_gallery_images(self):
        response = self.client.patch(
            self.product_detail_url(self.product),
            {
                'gallery_images': [
                    self.create_test_image('forbidden.jpg'),
                ],
            },
            format='multipart',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertEqual(
            ProductImage.objects.filter(
                product=self.product,
            ).count(),
            0,
        )

    def test_product_deletion_deletes_gallery_images(self):
        ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('first.jpg'),
            order=0,
        )

        ProductImage.objects.create(
            product=self.product,
            image=self.create_test_image('second.jpg'),
            order=1,
        )

        self.assertEqual(
            ProductImage.objects.filter(
                product=self.product,
            ).count(),
            2,
        )

        self.client.force_authenticate(user=self.manager)

        response = self.client.delete(
            self.product_detail_url(self.product),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Product.objects.filter(
                pk=self.product.pk,
            ).exists()
        )

        self.assertEqual(
            ProductImage.objects.filter(
                product_id=self.product.pk,
            ).count(),
            0,
        )