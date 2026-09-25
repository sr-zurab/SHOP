from django.contrib.auth import get_user_model
from django.test import TestCase

from cart.models import Cart, CartItem
from shop.models import Category, Product, ProductAttribute


User = get_user_model()


class LoginCartMergeTests(TestCase):
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
            name='Телевизор Samsung',
            slug='samsung-test',
            price='50000.00',
            stock=0,
            available=True,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='диагональ',
            value="60''",
            stock=2,
            available=True,
        )

    def test_login_merges_anonymous_cart(self):
        # Этот запрос создаёт анонимную корзину
        # и устанавливает session cookie клиенту.
        self.client.get('/api/cart/')

        session_key = self.client.session.session_key

        anon_cart = Cart.objects.get(
            user=None,
            session_key=session_key,
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=self.product,
            quantity=2,
            selected_attributes={
                'диагональ': "60''",
            },
        )

        response = self.client.post(
            '/api/auth/token/',
            {
                'username': 'testuser',
                'password': 'testpass123',
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)

        user_cart = Cart.objects.get(
            user=self.user
        )

        item = CartItem.objects.get(
            cart=user_cart,
            product=self.product,
        )

        self.assertEqual(item.quantity, 2)

        self.assertEqual(
            item.selected_attributes,
            {
                'диагональ': "60''",
            },
        )

        self.assertFalse(
            Cart.objects.filter(
                user=None,
                session_key=session_key,
            ).exists()
        )