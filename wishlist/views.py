from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from shop.models import Product
from .models import Wishlist
from .serializers import WishlistSerializer


class WishlistViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def _get_queryset(self, request):
        if request.user.is_authenticated:
            return Wishlist.objects.filter(user=request.user).select_related(
                'product', 'product__category'
            )

        if not request.session.session_key:
            request.session.create()
        return Wishlist.objects.filter(session_key=request.session.session_key).select_related(
            'product', 'product__category'
        )

    def list(self, request):
        items = self._get_queryset(request)
        return Response(
            WishlistSerializer(items, many=True, context={'request': request}).data
        )

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        product = get_object_or_404(Product, id=product_id)

        if request.user.is_authenticated:
            existing = Wishlist.objects.filter(user=request.user, product=product).first()
            if existing:
                existing.delete()
                return Response({'in_wishlist': False})

            Wishlist.objects.create(user=request.user, product=product)
            return Response({'in_wishlist': True})

        if not request.session.session_key:
            request.session.create()

        existing = Wishlist.objects.filter(
            session_key=request.session.session_key,
            product=product,
        ).first()
        if existing:
            existing.delete()
            return Response({'in_wishlist': False})

        Wishlist.objects.create(session_key=request.session.session_key, product=product)
        return Response({'in_wishlist': True})