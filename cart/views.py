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
        return Cart.objects.prefetch_related('items__product').get(pk=cart.pk)

    def list(self, request):
        cart = self._get_cart_with_items(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        serializer = AddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        cart = get_or_create_cart(request)
        product = get_object_or_404(Product, id=product_id, available=True)

        item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        new_quantity = quantity if created else item.quantity + quantity

        if new_quantity > product.stock:
            return Response(
                {'detail': f'Доступно только {product.stock} шт.'},
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

        cart = get_or_create_cart(request)
        item = get_object_or_404(CartItem, cart=cart, product_id=product_id)

        if quantity == 0:
            item.delete()
        else:
            if quantity > item.product.stock:
                return Response(
                    {'detail': f'Доступно только {item.product.stock} шт.'},
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

        cart = get_or_create_cart(request)
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()

        cart = self._get_cart_with_items(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        cart = get_or_create_cart(request)
        cart.items.all().delete()
        return Response(CartSerializer(cart, context={'request': request}).data)