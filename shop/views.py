from django.db.models import Avg, Count
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Product, Category, ProductImage
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, CategorySerializer,
    ProductWriteSerializer,
)

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


class IsManagerOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_manager)


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsManagerOrReadOnly]
    pagination_class = ProductPagination
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsManagerOrReadOnly()]

    def get_queryset(self):
        qs = Product.objects.select_related('category')

        if self.action == 'list':
            qs = qs.filter(available=True)
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
        if self.action in ('create', 'update', 'partial_update'):
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def _create_gallery_images(self, product):
        for order, image in enumerate(self.request.FILES.getlist('gallery_images')):
            ProductImage.objects.create(product=product, image=image, order=order)

    def perform_create(self, serializer):
        product = serializer.save()
        self._create_gallery_images(product)

    def perform_update(self, serializer):
        product = serializer.save()
        last_order = product.images.order_by('-order').values_list('order', flat=True).first()
        start_order = (last_order + 1) if last_order is not None else 0
        for offset, image in enumerate(self.request.FILES.getlist('gallery_images')):
            ProductImage.objects.create(product=product, image=image, order=start_order + offset)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsManagerOrReadOnly()]