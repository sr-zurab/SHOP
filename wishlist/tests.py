from django.contrib.auth import get_user_model
from django.test import TestCase

from shop.models import Category, Product
from wishlist.models import Wishlist


class WishlistAnonymousAndMergeTests(TestCase):
    def setUp(self):
        category = Category.objects.create(name='Test category', slug='test-category')
        self.product = Product.objects.create(
            category=category,
            name='Test product',
            slug='test-product',
            price='10.00',
            stock=5,
        )
        self.second_product = Product.objects.create(
            category=category,
            name='Second product',
            slug='second-product',
            price='20.00',
            stock=7,
        )

    def test_anonymous_user_can_toggle_wishlist(self):
        session = self.client.session
        session.create()
        session_key = session.session_key

        response = self.client.post(
            '/api/wishlist/toggle/',
            {'product_id': self.product.id},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['in_wishlist'])
        self.assertTrue(
            Wishlist.objects.filter(session_key=session_key, product=self.product).exists()
        )

    def test_wishlist_is_merged_to_user_after_login(self):
        session = self.client.session
        session.create()
        session_key = session.session_key

        self.client.post(
            '/api/wishlist/toggle/',
            {'product_id': self.product.id},
            content_type='application/json',
        )
        self.client.post(
            '/api/wishlist/toggle/',
            {'product_id': self.second_product.id},
            content_type='application/json',
        )

        user = get_user_model().objects.create_user(username='alice', password='strong-pass123')

        login_response = self.client.post(
            '/api/auth/token/',
            {'username': 'alice', 'password': 'strong-pass123'},
            content_type='application/json',
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(Wishlist.objects.filter(user=user, product=self.product).exists())
        self.assertTrue(Wishlist.objects.filter(user=user, product=self.second_product).exists())
        self.assertFalse(Wishlist.objects.filter(session_key=session_key).exists())

