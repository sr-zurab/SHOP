from django.db.models import Avg, Count
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Product, Category, ProductImage, ProductAttribute
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, CategorySerializer,
    ProductWriteSerializer, ManagerProductSerializer,
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


class IsManager(IsAuthenticated):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_manager', False)
        )


class IsManagerOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_manager)


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsManagerOrReadOnly]
    pagination_class = ProductPagination
    lookup_field = 'slug'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'manager_list':
            return [IsManager()]
        return [IsManagerOrReadOnly()]

    @action(detail=False, methods=['get'], url_path='manager-list')
    def manager_list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = ManagerProductSerializer(
            page if page is not None else queryset,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def get_queryset(self):
        qs = Product.objects.select_related('category')

        if self.action == 'list':
            qs = qs.filter(available=True)
            qs = qs.annotate(
                orders_count=Count('orderitem', distinct=True),
                avg_rating=Avg('reviews__rating'),
            )
        else:
            qs = qs.prefetch_related('images', 'attributes')

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
        if self.action == 'manager_list':
            return ManagerProductSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def _parse_attributes_from_formdata(self, data):
        """Parse attributes[0][name], attributes[0][value] format from FormData."""
        attributes = []
        attr_dict = {}
        for key, value in data.items():
            if key.startswith('attributes[') and '][' in key:
                # key format: attributes[0][name]
                try:
                    index_str = key.split('[')[1].split(']')[0]
                    field = key.split('][')[1].rstrip(']')
                    index = int(index_str)
                    if index not in attr_dict:
                        attr_dict[index] = {}
                    attr_dict[index][field] = value
                except (IndexError, ValueError):
                    continue
        for index in sorted(attr_dict.keys()):
            attr = attr_dict[index]
            # Only add if has required fields
            if attr.get('name') and attr.get('value'):
                # Convert stock to int, available to bool
                attributes.append({
                    'name': attr.get('name', ''),
                    'value': attr.get('value', ''),
                    'stock': int(attr.get('stock', 0)) if attr.get('stock') else 0,
                    'available': attr.get('available') in ('true', 'True', '1', True),
                })
        return attributes

    def _create_gallery_images(self, product):
        for order, image in enumerate(self.request.FILES.getlist('gallery_images')):
            ProductImage.objects.create(product=product, image=image, order=order)

    def create(self, request, *args, **kwargs):
        # Parse attributes from FormData
        attributes_data = self._parse_attributes_from_formdata(request.data)
        # Create mutable copy of data
        data = request.data.copy()
        # Remove attributes from data to avoid parser issues
        for key in list(data.keys()):
            if key.startswith('attributes['):
                del data[key]
        # Add parsed attributes
        data['attributes'] = attributes_data

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        self._create_gallery_images(product)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Parse attributes from FormData
        attributes_data = self._parse_attributes_from_formdata(request.data)
        data = request.data.copy()
        for key in list(data.keys()):
            if key.startswith('attributes['):
                del data[key]
        data['attributes'] = attributes_data

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        self._create_gallery_images(product)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsManagerOrReadOnly()]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Нельзя удалить категорию: в ней есть товары'},
                status=status.HTTP_400_BAD_REQUEST,
            )