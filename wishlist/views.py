from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from shop.models import Product
from .models import Wishlist
from .serializers import WishlistSerializer


class WishlistViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        items = Wishlist.objects.filter(user=request.user).select_related(
            'product', 'product__category'
        )
        return Response(
            WishlistSerializer(items, many=True, context={'request': request}).data
        )

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        product = get_object_or_404(Product, id=product_id)

        existing = Wishlist.objects.filter(user=request.user, product=product).first()
        if existing:
            existing.delete()
            return Response({'in_wishlist': False})

        Wishlist.objects.create(user=request.user, product=product)
        return Response({'in_wishlist': True})