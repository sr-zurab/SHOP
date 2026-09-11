from django.db.models import Avg, Count, Q
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from .models import Product, Category
from .serializers import ProductListSerializer, ProductDetailSerializer, CategorySerializer

ORDERING_MAP = {
    'price_asc': ['price'],
    'price_desc': ['-price'],
    'newest': ['-created'],
    'popular': ['-orders_count', '-created'],
    'rating': ['-avg_rating', '-created'],
}


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
            qs = qs.annotate(
                orders_count=Count('orderitem', distinct=True),
                avg_rating=Avg('reviews__rating'),
            )
        else:
            qs = qs.prefetch_related('images')

        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)

        ordering = self.request.query_params.get('ordering')
        if ordering in ORDERING_MAP:
            qs = qs.order_by(*ORDERING_MAP[ordering])

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        return {'request': self.request}


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'