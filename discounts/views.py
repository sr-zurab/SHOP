from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.utils import get_or_create_cart

from .availability import DiscountAvailabilityService
from .models import Discount
from .serializers import (
    DiscountCalculateRequestSerializer,
    DiscountCalculationSerializer,
    DiscountManagerSerializer,
)
from .services import DiscountLine, calculate_discounts


class IsManager(IsAuthenticated):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_manager', False)
        )


class DiscountCalculateAPIView(APIView):
    def post(self, request):
        request_serializer = DiscountCalculateRequestSerializer(
            data=request.data
        )

        if not request_serializer.is_valid():
            return Response(
                request_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_ids = request_serializer.validated_data['item_ids']

        cart = get_or_create_cart(request)

        cart_items = list(
            cart.items
            .select_related('product')
            .prefetch_related(
                'product__attributes',
                'product__discounts',
                'product__category__discounts',
            )
            .filter(id__in=item_ids)
        )

        found_item_ids = {item.id for item in cart_items}

        if found_item_ids != set(item_ids):
            return Response(
                {
                    'item_ids': (
                        'Некоторые товары не принадлежат текущей корзине.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        lines = [
            DiscountLine(
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price,
                selected_attributes=item.selected_attributes or {},
            )
            for item in cart_items
        ]

        discounts = Discount.objects.filter(
            status='active'
        ).prefetch_related(
            'products',
            'categories',
        )

        availability_service = DiscountAvailabilityService(
            user=(
                request.user
                if request.user.is_authenticated
                else None
            )
        )

        available_discounts = [
            discount
            for discount in discounts
            if availability_service.is_available(
                discount=discount
            )
        ]

        calculation = calculate_discounts(
            lines=lines,
            discounts=available_discounts,
        )

        serializer = DiscountCalculationSerializer(
            calculation
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class DiscountViewSet(viewsets.ModelViewSet):
    serializer_class = DiscountManagerSerializer
    permission_classes = [IsManager]

    queryset = Discount.objects.all().prefetch_related(
        'products',
        'categories',
    )

    def get_queryset(self):
        return self.queryset.order_by(
            '-priority',
            '-created_at',
        )