from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory

from cart.models import Cart, CartItem
from cart.utils import merge_cart
from shop.models import Product, ProductAttribute, Category


User = get_user_model()


class MergeCartTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword',
        )

        self.category = Category.objects.create(
            name='Тестовая категория',
            slug='test-category',
        )

        self.product = Product.objects.create(
            category=self.category,
            name='Тестовый телевизор',
            slug='test-tv',
            price=50000,
            stock=0,
            available=True,
        )

    def _create_request_with_session(self):
        request = self.factory.get('/')

        session = self.client.session
        session.create()
        request.session = session

        return request, session

    def test_merge_cart_preserves_different_attribute_variants(self):
        request, session = self._create_request_with_session()

        anon_cart = Cart.objects.create(
            user=None,
            session_key=session.session_key,
        )

        user_cart = Cart.objects.create(
            user=self.user,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='диагональ',
            value="60''",
            stock=2,
            available=True,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='диагональ',
            value="65''",
            stock=1,
            available=True,
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=self.product,
            quantity=2,
            selected_attributes={
                'диагональ': "60''",
            },
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=self.product,
            quantity=1,
            selected_attributes={
                'диагональ': "65''",
            },
        )

        merge_cart(request, self.user)

        items = CartItem.objects.filter(
            cart=user_cart,
        )

        self.assertEqual(items.count(), 2)

        variants = {
            tuple(item.selected_attributes.items()): item.quantity
            for item in items
        }

        self.assertEqual(
            variants[(('диагональ', "60''"),)],
            2,
        )

        self.assertEqual(
            variants[(('диагональ', "65''"),)],
            1,
        )

        self.assertFalse(
            Cart.objects.filter(
                user=None,
                session_key=session.session_key,
            ).exists()
        )

    def test_merge_new_regular_item_limits_quantity_by_product_stock(self):
        request, session = self._create_request_with_session()

        anon_cart = Cart.objects.create(
            user=None,
            session_key=session.session_key,
        )

        Cart.objects.create(
            user=self.user,
        )

        product = Product.objects.create(
            category=self.category,
            name='Обычный товар',
            slug='regular-product',
            price=1000,
            stock=3,
            available=True,
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=product,
            quantity=7,
            selected_attributes={},
        )

        merge_cart(request, self.user)

        item = CartItem.objects.get(
            cart__user=self.user,
            product=product,
        )

        self.assertEqual(item.quantity, 3)

    def test_merge_new_attribute_item_limits_quantity_by_attribute_stock(self):
        request, session = self._create_request_with_session()

        anon_cart = Cart.objects.create(
            user=None,
            session_key=session.session_key,
        )

        Cart.objects.create(
            user=self.user,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='диагональ',
            value="60''",
            stock=2,
            available=True,
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=self.product,
            quantity=7,
            selected_attributes={
                'диагональ': "60''",
            },
        )

        merge_cart(request, self.user)

        item = CartItem.objects.get(
            cart__user=self.user,
            product=self.product,
        )

        self.assertEqual(
            item.selected_attributes,
            {
                'диагональ': "60''",
            },
        )

        self.assertEqual(item.quantity, 2)

    def test_merge_existing_regular_item_limits_combined_quantity_by_product_stock(self):
        request, session = self._create_request_with_session()

        anon_cart = Cart.objects.create(
            user=None,
            session_key=session.session_key,
        )

        user_cart = Cart.objects.create(
            user=self.user,
        )

        product = Product.objects.create(
            category=self.category,
            name='Существующий обычный товар',
            slug='existing-regular-product',
            price=1000,
            stock=5,
            available=True,
        )

        CartItem.objects.create(
            cart=user_cart,
            product=product,
            quantity=3,
            selected_attributes={},
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=product,
            quantity=4,
            selected_attributes={},
        )

        merge_cart(request, self.user)

        item = CartItem.objects.get(
            cart=user_cart,
            product=product,
            selected_attributes={},
        )

        self.assertEqual(item.quantity, 5)

    def test_merge_existing_attribute_item_limits_combined_quantity_by_attribute_stock(self):
        request, session = self._create_request_with_session()

        anon_cart = Cart.objects.create(
            user=None,
            session_key=session.session_key,
        )

        user_cart = Cart.objects.create(
            user=self.user,
        )

        ProductAttribute.objects.create(
            product=self.product,
            name='диагональ',
            value="60''",
            stock=5,
            available=True,
        )

        selected_attributes = {
            'диагональ': "60''",
        }

        CartItem.objects.create(
            cart=user_cart,
            product=self.product,
            quantity=3,
            selected_attributes=selected_attributes,
        )

        CartItem.objects.create(
            cart=anon_cart,
            product=self.product,
            quantity=4,
            selected_attributes=selected_attributes,
        )

        merge_cart(request, self.user)

        item = CartItem.objects.get(
            cart=user_cart,
            product=self.product,
            selected_attributes=selected_attributes,
        )

        self.assertEqual(item.quantity, 5)

    def test_merge_deletes_anonymous_cart(self):
        request, session = self._create_request_with_session()

        anon_cart = Cart.objects.create(
            user=None,
            session_key=session.session_key,
        )

        Cart.objects.create(
            user=self.user,
        )

        merge_cart(request, self.user)

        self.assertFalse(
            Cart.objects.filter(
                pk=anon_cart.pk,
            ).exists()
        )

    def test_merge_without_session_key_does_nothing(self):
        request = self.factory.get('/')

        request.session = self.client.session
        request.session.flush()

        merge_cart(request, self.user)

        self.assertFalse(
            Cart.objects.filter(
                user=self.user,
            ).exists()
        )