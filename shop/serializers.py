import json
from decimal import Decimal

from django.db import models
from rest_framework import serializers

from discounts.constants import DiscountType

from .models import (
    Product,
    Category,
    ProductImage,
    ProductAttribute,
)


class CategorySerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'parent',
        ]

    def validate_parent(self, parent):
        instance = self.instance

        if parent is None or instance is None:
            return parent

        if parent.pk == instance.pk:
            raise serializers.ValidationError(
                'Категория не может быть родителем самой себя.'
            )

        current = parent

        while current is not None:
            if current.pk == instance.pk:
                raise serializers.ValidationError(
                    'Нельзя создать циклическую структуру категорий.'
                )
            current = current.parent

        return parent


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'thumbnail', 'order']

    def get_image(self, obj):
        request = self.context.get('request')

        return (
            request.build_absolute_uri(obj.image_detail.url)
            if request
            else obj.image_detail.url
        )

    def get_thumbnail(self, obj):
        request = self.context.get('request')

        return (
            request.build_absolute_uri(obj.thumbnail.url)
            if request
            else obj.thumbnail.url
        )


class ProductAttributeSerializer(serializers.ModelSerializer):
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductAttribute
        fields = [
            'id',
            'name',
            'value',
            'stock',
            'available',
            'in_stock',
        ]

    def get_in_stock(self, obj):
        return obj.in_stock


class ProductDiscountSerializer(serializers.Serializer):
    type = serializers.CharField()
    value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    price_after_discount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        allow_null=True,
    )


class ProductListSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(
        slug_field='slug',
        read_only=True,
    )
    in_stock = serializers.SerializerMethodField()
    has_attributes = serializers.SerializerMethodField()
    grouped_attributes = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'price',
            'thumbnail',
            'category',
            'in_stock',
            'stock',
            'has_attributes',
            'grouped_attributes',
            'discount',
        ]

    def get_thumbnail(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(obj.thumbnail.url)
            if request
            else obj.thumbnail.url
        )

    def get_in_stock(self, obj):
        if obj.attributes.exists():
            return obj.attributes.filter(
                available=True,
                stock__gt=0,
            ).exists()

        return obj.stock > 0

    def get_has_attributes(self, obj):
        return obj.attributes.exists()

    def get_grouped_attributes(self, obj):
        attrs = obj.attributes.filter(available=True)
        grouped = {}

        for attr in attrs:
            grouped.setdefault(attr.name, []).append({
                'id': attr.id,
                'value': attr.value,
                'stock': attr.stock,
                'available': attr.available,
                'in_stock': attr.in_stock,
            })

        return grouped

    def _get_product_discounts(self, obj):
        discounts_by_product = self.context.get(
            'discounts_by_product',
            {},
        )
        discounts_by_category = self.context.get(
            'discounts_by_category',
            {},
        )
        global_discounts = self.context.get(
            'global_discounts',
            [],
        )

        discounts = []

        discounts.extend(
            discounts_by_product.get(
                obj.id,
                [],
            )
        )

        discounts.extend(
            discounts_by_category.get(
                obj.category_id,
                [],
            )
        )

        discounts.extend(global_discounts)

        unique_discounts = {}
        for discount in discounts:
            unique_discounts[discount.id] = discount

        return list(
            unique_discounts.values()
        )

    def _get_discount_data(self, obj, discount):
        value = Decimal(discount.value)

        if discount.discount_type == DiscountType.PERCENT:
            amount = (
                Decimal(obj.price)
                * value
                / Decimal('100')
            )

            if discount.max_discount_amount is not None:
                amount = min(
                    amount,
                    Decimal(
                        discount.max_discount_amount
                    ),
                )

            amount = min(
                amount,
                Decimal(obj.price),
            )

            price_after_discount = (
                Decimal(obj.price) - amount
            )

            return {
                'type': discount.discount_type,
                'value': value,
                'amount': amount,
                'price_after_discount': price_after_discount,
            }

        amount = min(
            value,
            Decimal(obj.price),
        )

        return {
            'type': discount.discount_type,
            'value': value,
            'amount': amount,
            'price_after_discount': None,
        }

    def get_discount(self, obj):
        discounts = self._get_product_discounts(obj)

        if not discounts:
            return None

        best_discount = None
        best_amount = Decimal('0.00')

        for discount in discounts:
            data = self._get_discount_data(
                obj,
                discount,
            )

            amount = Decimal(data['amount'])

            if amount > best_amount:
                best_amount = amount
                best_discount = data

        return best_discount


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )
    category = CategorySerializer(read_only=True)
    main_image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(
        many=True,
        read_only=True,
    )
    grouped_attributes = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'images',
            'main_image',
            'category',
            'in_stock',
            'stock',
            'thumbnail',
            'average_rating',
            'reviews_count',
            'attributes',
            'grouped_attributes',
            'discount',
        ]

    def get_main_image(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(obj.image_detail.url)
            if request
            else obj.image_detail.url
        )

    def get_thumbnail(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(obj.thumbnail.url)
            if request
            else obj.thumbnail.url
        )

    def get_in_stock(self, obj):
        if obj.attributes.exists():
            return obj.attributes.filter(
                available=True,
                stock__gt=0,
            ).exists()

        return obj.stock > 0

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(
            models.Avg('rating')
        )['rating__avg']

        return round(avg, 1) if avg else None

    def get_reviews_count(self, obj):
        return obj.reviews.count()

    def get_grouped_attributes(self, obj):
        attrs = obj.attributes.filter(available=True)
        grouped = {}

        for attr in attrs:
            grouped.setdefault(attr.name, []).append({
                'id': attr.id,
                'value': attr.value,
                'stock': attr.stock,
                'available': attr.available,
                'in_stock': attr.in_stock,
            })

        return grouped

    def _get_product_discounts(self, obj):
        discounts_by_product = self.context.get(
            'discounts_by_product',
            {},
        )
        discounts_by_category = self.context.get(
            'discounts_by_category',
            {},
        )
        global_discounts = self.context.get(
            'global_discounts',
            [],
        )

        discounts = []

        discounts.extend(
            discounts_by_product.get(
                obj.id,
                [],
            )
        )

        discounts.extend(
            discounts_by_category.get(
                obj.category_id,
                [],
            )
        )

        discounts.extend(global_discounts)

        unique_discounts = {}
        for discount in discounts:
            unique_discounts[discount.id] = discount

        return list(
            unique_discounts.values()
        )

    def _get_discount_data(self, obj, discount):
        value = Decimal(discount.value)

        if discount.discount_type == DiscountType.PERCENT:
            amount = (
                Decimal(obj.price)
                * value
                / Decimal('100')
            )

            if discount.max_discount_amount is not None:
                amount = min(
                    amount,
                    Decimal(
                        discount.max_discount_amount
                    ),
                )

            amount = min(
                amount,
                Decimal(obj.price),
            )

            price_after_discount = (
                Decimal(obj.price) - amount
            )

            return {
                'type': discount.discount_type,
                'value': value,
                'amount': amount,
                'price_after_discount': price_after_discount,
            }

        amount = min(
            value,
            Decimal(obj.price),
        )

        return {
            'type': discount.discount_type,
            'value': value,
            'amount': amount,
            'price_after_discount': None,
        }

    def get_discount(self, obj):
        discounts = self._get_product_discounts(obj)

        if not discounts:
            return None

        best_discount = None
        best_amount = Decimal('0.00')

        for discount in discounts:
            data = self._get_discount_data(
                obj,
                discount,
            )

            amount = Decimal(data['amount'])

            if amount > best_amount:
                best_amount = amount
                best_discount = data

        return best_discount


class ProductAttributeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = [
            'id',
            'name',
            'value',
            'stock',
            'available',
        ]


class ProductWriteSerializer(serializers.ModelSerializer):
    attributes = ProductAttributeWriteSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'category',
            'name',
            'slug',
            'description',
            'price',
            'available',
            'stock',
            'image',
            'attributes',
        ]

    def validate_attributes(self, attributes):
        seen = set()

        for attribute in attributes:
            key = (
                attribute['name'].strip(),
                attribute['value'].strip(),
            )

            if key in seen:
                raise serializers.ValidationError(
                    'Для одного товара нельзя добавить два одинаковых '
                    'атрибута с одинаковыми названием и значением.'
                )

            seen.add(key)

        return attributes

    def to_internal_value(self, data):
        attrs_raw = (
            data.get('attributes')
            if hasattr(data, 'get')
            else None
        )

        if isinstance(attrs_raw, str):
            try:
                parsed_attrs = json.loads(attrs_raw)
            except (TypeError, ValueError):
                parsed_attrs = []

            data = data.dict() if hasattr(data, 'dict') else dict(data)
            data['attributes'] = parsed_attrs

        return super().to_internal_value(data)

    def create(self, validated_data):
        attributes_data = validated_data.pop(
            'attributes',
            [],
        )

        product = Product.objects.create(**validated_data)

        for attr_data in attributes_data:
            ProductAttribute.objects.create(
                product=product,
                **attr_data,
            )

        return product

    def update(self, instance, validated_data):
        attributes_data = validated_data.pop(
            'attributes',
            None,
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if attributes_data is not None:
            instance.attributes.all().delete()

            for attr_data in attributes_data:
                ProductAttribute.objects.create(
                    product=instance,
                    **attr_data,
                )

        return instance


class ManagerProductSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    in_stock = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'stock',
            'available',
            'thumbnail',
            'category',
            'in_stock',
            'attributes',
        ]

    def get_thumbnail(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(obj.thumbnail.url)
            if request
            else obj.thumbnail.url
        )

    def get_in_stock(self, obj):
        if obj.attributes.exists():
            return obj.attributes.filter(
                available=True,
                stock__gt=0,
            ).exists()

        return obj.stock > 0