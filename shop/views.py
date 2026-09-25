from django.db.models import Avg, Count
from django.db.models.deletion import ProtectedError

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from discounts.availability import get_available_discounts
from discounts.constants import DiscountStatus
from discounts.models import Discount

from .models import Product, Category, ProductImage
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    CategorySerializer,
    ProductWriteSerializer,
    ManagerProductSerializer,
)


ORDERING_MAP = {
    'price_asc': ['price', 'id'],
    'price_desc': ['-price', 'id'],
    'newest': ['-created', 'id'],
    'popular': ['-orders_count', '-created', 'id'],
    'rating': ['-avg_rating', '-created', 'id'],
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

        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_manager
        )


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

    @action(
        detail=False,
        methods=['get'],
        url_path='manager-list',
    )
    def manager_list(self, request):
        queryset = self.filter_queryset(
            self.get_queryset()
        )

        page = self.paginate_queryset(queryset)

        serializer = ManagerProductSerializer(
            page if page is not None else queryset,
            many=True,
            context=self.get_serializer_context(),
        )

        if page is not None:
            return self.get_paginated_response(
                serializer.data
            )

        return Response(serializer.data)

    def _get_category_tree_ids(self, category):
        category_ids = [category.pk]
        current_ids = [category.pk]

        while current_ids:
            child_ids = list(
                Category.objects.filter(
                    parent_id__in=current_ids,
                ).values_list(
                    'id',
                    flat=True,
                )
            )

            if not child_ids:
                break

            category_ids.extend(child_ids)
            current_ids = child_ids

        return category_ids

    def _get_available_display_discounts(self):
        discounts = Discount.objects.filter(
            status=DiscountStatus.ACTIVE,
        ).prefetch_related(
            'products',
            'categories',
        )

        user = (
            self.request.user
            if self.request.user.is_authenticated
            else None
        )

        return get_available_discounts(
            discounts=discounts,
            user=user,
        )

    def _get_product_display_discounts(self, products):
        discounts = self._get_available_display_discounts()

        product_ids = {
            product.id
            for product in products
        }

        category_ids = {
            product.category_id
            for product in products
            if product.category_id is not None
        }

        discounts_by_product = {}
        discounts_by_category = {}
        global_discounts = []

        for discount in discounts:
            discount_product_ids = {
                product.id
                for product in discount.products.all()
            }

            discount_category_ids = {
                category.id
                for category in discount.categories.all()
            }

            if (
                not discount_product_ids
                and not discount_category_ids
            ):
                global_discounts.append(discount)
                continue

            for product_id in (
                discount_product_ids & product_ids
            ):
                discounts_by_product.setdefault(
                    product_id,
                    [],
                ).append(discount)

            for category_id in (
                discount_category_ids & category_ids
            ):
                discounts_by_category.setdefault(
                    category_id,
                    [],
                ).append(discount)

        return {
            'discounts_by_product': discounts_by_product,
            'discounts_by_category': discounts_by_category,
            'global_discounts': global_discounts,
        }

    def get_queryset(self):
        qs = Product.objects.select_related(
            'category'
        )

        if self.action == 'list':
            qs = qs.filter(
                available=True
            )

            qs = qs.annotate(
                orders_count=Count(
                    'orderitem',
                    distinct=True,
                ),
                avg_rating=Avg(
                    'reviews__rating',
                ),
            )

            qs = qs.prefetch_related(
                'attributes',
                'variants',
                'discounts',
                'category__discounts',
            )
        else:
            qs = qs.prefetch_related(
                'images',
                'attributes',
                'variants',
            )

        category_slug = (
            self.request.query_params.get(
                'category'
            )
        )

        if category_slug:
            category = Category.objects.filter(
                slug=category_slug,
            ).first()

            if category:
                category_ids = (
                    self._get_category_tree_ids(
                        category,
                    )
                )

                qs = qs.filter(
                    category_id__in=category_ids,
                )

        search = self.request.query_params.get(
            'search'
        )

        if search:
            qs = qs.filter(
                name__icontains=search,
            )

        ordering = self.request.query_params.get(
            'ordering'
        )

        if ordering in ORDERING_MAP:
            qs = qs.order_by(
                *ORDERING_MAP[ordering],
            )
        else:
            qs = qs.order_by('id')

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer

        if self.action == 'manager_list':
            return ManagerProductSerializer

        if self.action in (
            'create',
            'update',
            'partial_update',
        ):
            return ProductWriteSerializer

        return ProductDetailSerializer

    def get_serializer_context(self):
        context = {
            'request': self.request,
        }

        if self.action == 'list':
            products = getattr(
                self,
                '_display_discount_products',
                None,
            )

            if products is not None:
                context.update(
                    self._get_product_display_discounts(
                        products,
                    )
                )

        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(
            self.get_queryset()
        )

        page = self.paginate_queryset(queryset)

        products = (
            list(page)
            if page is not None
            else list(queryset)
        )

        self._display_discount_products = products

        serializer = self.get_serializer(
            products,
            many=True,
        )

        if page is not None:
            return self.get_paginated_response(
                serializer.data
            )

        return Response(
            serializer.data
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        context = self.get_serializer_context()

        context.update(
            self._get_product_display_discounts(
                [instance],
            )
        )

        serializer = self.get_serializer(
            instance,
            context=context,
        )

        return Response(serializer.data)

    def _create_gallery_images(self, product):
        for order, image in enumerate(
            self.request.FILES.getlist(
                'gallery_images'
            )
        ):
            ProductImage.objects.create(
                product=product,
                image=image,
                order=order,
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        product = serializer.save()

        self._create_gallery_images(product)

        headers = self.get_success_headers(
            serializer.data,
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop(
            'partial',
            False,
        )

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        product = serializer.save()

        self._create_gallery_images(product)

        if getattr(
            instance,
            '_prefetched_objects_cache',
            None,
        ):
            instance._prefetched_objects_cache = {}

        return Response(
            serializer.data,
        )


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
            return super().destroy(
                request,
                *args,
                **kwargs,
            )

        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'Нельзя удалить категорию: '
                        'в ней есть товары'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )