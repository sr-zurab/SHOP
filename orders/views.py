from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.utils import get_or_create_cart
from shop.models import Product
from shop.views import IsManager
from .models import Order, OrderItem, OrderComment
from .serializers import (
    OrderSerializer, CreateOrderSerializer, ManagerOrderSerializer,
    UpdateOrderStatusSerializer, CreateOrderCommentSerializer, OrderCommentSerializer,
)


def restore_order_stock(order):
    for item in order.items.select_related('product'):
        if item.product:
            product = Product.objects.select_for_update().get(pk=item.product.pk)
            product.stock += item.quantity
            product.save(update_fields=['stock'])


class OrderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        orders = (
            Order.objects.filter(user=request.user)
            .prefetch_related('items', 'comments', 'comments__author')
        )
        return Response(OrderSerializer(orders, many=True).data)

    def retrieve(self, request, pk=None):
        order = get_object_or_404(
            Order.objects.prefetch_related('items', 'comments', 'comments__author'),
            pk=pk,
            user=request.user,
        )
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

        order = Order.objects.prefetch_related('items', 'comments', 'comments__author').get(pk=order.pk)
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
            restore_order_stock(order)
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])

        order = Order.objects.prefetch_related('items', 'comments', 'comments__author').get(pk=order.pk)
        return Response(OrderSerializer(order).data)


class ManagerOrderListView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        qs = Order.objects.select_related('user').prefetch_related(
            'items', 'comments', 'comments__author',
        )

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get('search', '').strip()
        if search:
            filters = (
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(user__username__icontains=search)
            )
            order_id = search.lstrip('#')
            if order_id.isdigit():
                filters |= Q(id=int(order_id))
            qs = qs.filter(filters)

        return Response(ManagerOrderSerializer(qs, many=True).data)


class ManagerOrderDetailView(APIView):
    permission_classes = [IsManager]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related('user').prefetch_related(
                'items', 'comments', 'comments__author',
            ),
            pk=pk,
        )
        return Response(ManagerOrderSerializer(order).data)


class ManagerOrderStatusView(APIView):
    permission_classes = [IsManager]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = UpdateOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        old_status = order.status

        if new_status == old_status:
            order = Order.objects.select_related('user').prefetch_related(
                'items', 'comments', 'comments__author',
            ).get(pk=order.pk)
            return Response(ManagerOrderSerializer(order).data)

        with transaction.atomic():
            if new_status == Order.Status.CANCELLED and old_status != Order.Status.CANCELLED:
                restore_order_stock(order)

            order.status = new_status
            order.save(update_fields=['status', 'updated'])

        order = Order.objects.select_related('user').prefetch_related(
            'items', 'comments', 'comments__author',
        ).get(pk=order.pk)
        return Response(ManagerOrderSerializer(order).data)


class ManagerOrderCommentView(APIView):
    permission_classes = [IsManager]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = CreateOrderCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = OrderComment.objects.create(
            order=order,
            author=request.user,
            text=serializer.validated_data['text'].strip(),
        )
        return Response(OrderCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
