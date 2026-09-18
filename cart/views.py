from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from shop.models import Product
from .models import Cart, CartItem
from .serializers import (
    CartSerializer, AddItemSerializer,
    UpdateItemSerializer, RemoveItemSerializer,
)
from .utils import get_or_create_cart


class CartViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def _get_cart_with_items(self, request):
        cart = get_or_create_cart(request)
        return Cart.objects.prefetch_related('items__product__attributes').get(pk=cart.pk)

    def _get_attribute_stock(self, product, selected_attributes):
        if not selected_attributes:
            return product.stock
        attrs = product.attributes.filter(
            name__in=selected_attributes.keys(),
            value__in=selected_attributes.values(),
            available=True
        )
        if attrs.exists():
            return min(attr.stock for attr in attrs)
        return 0

    def _get_cart_item(self, cart, product_id, selected_attributes):
        return get_object_or_404(
            CartItem,
            cart=cart,
            product_id=product_id,
            selected_attributes=selected_attributes,
        )

    def list(self, request):
        cart = self._get_cart_with_items(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        serializer = AddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']
        selected_attributes = serializer.validated_data.get('selected_attributes', {})

        cart = get_or_create_cart(request)

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            selected_attributes=selected_attributes,
            defaults={'quantity': 0}
        )
        new_quantity = item.quantity + quantity

        max_stock = self._get_attribute_stock(product, selected_attributes)
        if new_quantity > max_stock:
            return Response(
                {'detail': f'Доступно только {max_stock} шт.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = new_quantity
        item.save()

        cart = self._get_cart_with_items(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        serializer = UpdateItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        selected_attributes = serializer.validated_data.get('selected_attributes', {})

        cart = get_or_create_cart(request)
        item = self._get_cart_item(cart, product_id, selected_attributes)

        if quantity == 0:
            item.delete()
        else:
            max_stock = self._get_attribute_stock(item.product, item.selected_attributes)
            if quantity > max_stock:
                return Response(
                    {'detail': f'Доступно только {max_stock} шт.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.quantity = quantity
            item.save()

        cart = self._get_cart_with_items(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        serializer = RemoveItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data['product_id']
        selected_attributes = serializer.validated_data.get('selected_attributes', {})

        cart = get_or_create_cart(request)
        item = self._get_cart_item(cart, product_id, selected_attributes)
        item.delete()

        cart = self._get_cart_with_items(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        cart = get_or_create_cart(request)
        cart.items.all().delete()
        return Response(CartSerializer(cart, context={'request': request}).data)