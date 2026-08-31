from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from .models import Product
from .serializers import ProductListSerializer, ProductDetailSerializer

class ProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    pagination_class = ProductPagination
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Product.objects.filter(available=True).select_related('category')
        if self.action == 'list':
            pass
        else:
                qs = qs.prefetch_related('images')
        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        return {'request': self.request}