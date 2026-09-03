from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cart.utils import get_or_create_cart
from shop.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer


class OrderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items')
        return Response(OrderSerializer(orders, many=True).data)

    def retrieve(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        return Response(OrderSerializer(order).data)

    def create(self, request):
        cart = get_or_create_cart(request)
        cart_items = cart.items.select_related('product').all()

        if not cart_items:
            return Response({'detail': 'Корзина пуста'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            order = Order.objects.create(user=request.user, **serializer.validated_data)

            for cart_item in cart_items:
                product = Product.objects.select_for_update().get(pk=cart_item.product.pk)

                if product.stock < cart_item.quantity:
                    transaction.set_rollback(True)
                    return Response(
                        {'detail': f'Недостаточно "{product.name}" на складе'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                product.stock -= cart_item.quantity
                product.save(update_fields=['stock'])

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    price=product.price,
                    quantity=cart_item.quantity,
                )

            cart_items.delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        if order.status not in (Order.Status.PENDING, Order.Status.PAID):
            return Response(
                {'detail': 'Заказ на этом этапе отменить нельзя'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for item in order.items.select_related('product'):
                if item.product:  # товар мог быть удалён из каталога
                    product = Product.objects.select_for_update().get(pk=item.product.pk)
                    product.stock += item.quantity
                    product.save(update_fields=['stock'])

            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])

        return Response(OrderSerializer(order).data)