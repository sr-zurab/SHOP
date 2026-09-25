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
    ProductVariant,
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
        fields = [
            'id',
            'image',
            'thumbnail',
            'order',
        ]

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
    class Meta:
        model = ProductAttribute
        fields = [
            'id',
            'name',
            'value',
            'available',
        ]


class ProductVariantSerializer(serializers.ModelSerializer):
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'attributes',
            'price',
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
    variants = ProductVariantSerializer(
        many=True,
        read_only=True,
    )
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
            'variants',
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
        if obj.variants.exists():
            return obj.variants.filter(
                available=True,
                stock__gt=0,
            ).exists()

        return obj.stock > 0

    def get_has_attributes(self, obj):
        return obj.attributes.exists()

    def get_grouped_attributes(self, obj):
        attrs = obj.attributes.filter(
            available=True,
        )

        grouped = {}

        for attr in attrs:
            grouped.setdefault(
                attr.name,
                [],
            ).append({
                'id': attr.id,
                'value': attr.value,
                'available': attr.available,
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

        return list(unique_discounts.values())

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
                    Decimal(discount.max_discount_amount),
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
    category = CategorySerializer(
        read_only=True,
    )
    main_image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(
        many=True,
        read_only=True,
    )
    variants = ProductVariantSerializer(
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
            'variants',
            'grouped_attributes',
            'discount',
        ]

    def get_main_image(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(
                obj.image_detail.url
            )
            if request
            else obj.image_detail.url
        )

    def get_thumbnail(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(
                obj.thumbnail.url
            )
            if request
            else obj.thumbnail.url
        )

    def get_in_stock(self, obj):
        if obj.variants.exists():
            return obj.variants.filter(
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
        attrs = obj.attributes.filter(
            available=True,
        )

        grouped = {}

        for attr in attrs:
            grouped.setdefault(
                attr.name,
                [],
            ).append({
                'id': attr.id,
                'value': attr.value,
                'available': attr.available,
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

        return list(unique_discounts.values())

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
                    Decimal(discount.max_discount_amount),
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
            'available',
        ]


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'attributes',
            'price',
            'stock',
            'available',
        ]

    def validate_attributes(self, attributes):
        if not isinstance(attributes, dict):
            raise serializers.ValidationError(
                'Атрибуты варианта должны быть объектом.'
            )

        normalized = {}

        for name, value in attributes.items():
            name = str(name).strip()
            value = str(value).strip()

            if not name or not value:
                raise serializers.ValidationError(
                    'Название и значение атрибута не могут быть пустыми.'
                )

            normalized[name] = value

        return normalized


class ProductWriteSerializer(serializers.ModelSerializer):
    attributes = ProductAttributeWriteSerializer(
        many=True,
        required=False,
    )
    variants = ProductVariantWriteSerializer(
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
            'variants',
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

    def validate_variants(self, variants):
        seen = set()

        for variant in variants:
            attributes = variant.get(
                'attributes',
                {},
            )

            normalized = tuple(
                sorted(
                    (
                        str(name).strip(),
                        str(value).strip(),
                    )
                    for name, value in attributes.items()
                )
            )

            if normalized in seen:
                raise serializers.ValidationError(
                    'Нельзя добавить два одинаковых варианта товара.'
                )

            seen.add(normalized)

        return variants

    def to_internal_value(self, data):
        attrs_raw = (
            data.get('attributes')
            if hasattr(data, 'get')
            else None
        )

        variants_raw = (
            data.get('variants')
            if hasattr(data, 'get')
            else None
        )

        if isinstance(attrs_raw, str):
            try:
                parsed_attrs = json.loads(
                    attrs_raw
                )
            except (TypeError, ValueError):
                parsed_attrs = []

            data = (
                data.dict()
                if hasattr(data, 'dict')
                else dict(data)
            )

            data['attributes'] = parsed_attrs

        if isinstance(variants_raw, str):
            try:
                parsed_variants = json.loads(
                    variants_raw
                )
            except (TypeError, ValueError):
                parsed_variants = []

            if not isinstance(data, dict):
                data = dict(data)

            data['variants'] = parsed_variants

        return super().to_internal_value(data)

    def create(self, validated_data):
        attributes_data = validated_data.pop(
            'attributes',
            [],
        )

        variants_data = validated_data.pop(
            'variants',
            [],
        )

        product = Product.objects.create(
            **validated_data
        )

        for attr_data in attributes_data:
            ProductAttribute.objects.create(
                product=product,
                **attr_data
            )

        for variant_data in variants_data:
            ProductVariant.objects.create(
                product=product,
                **variant_data
            )

        return product

    def update(self, instance, validated_data):
        attributes_data = validated_data.pop(
            'attributes',
            None,
        )

        variants_data = validated_data.pop(
            'variants',
            None,
        )

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        instance.save()

        if attributes_data is not None:
            instance.attributes.all().delete()

            for attr_data in attributes_data:
                ProductAttribute.objects.create(
                    product=instance,
                    **attr_data
                )

        if variants_data is not None:
            instance.variants.all().delete()

            for variant_data in variants_data:
                ProductVariant.objects.create(
                    product=instance,
                    **variant_data
                )

        return instance


class ManagerProductSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    category = CategorySerializer(
        read_only=True,
    )
    in_stock = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(
        many=True,
        read_only=True,
    )
    variants = ProductVariantSerializer(
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
            'variants',
        ]

    def get_thumbnail(self, obj):
        request = self.context.get('request')

        if not obj.image:
            return None

        return (
            request.build_absolute_uri(
                obj.thumbnail.url
            )
            if request
            else obj.thumbnail.url
        )

    def get_in_stock(self, obj):
        if obj.variants.exists():
            return obj.variants.filter(
                available=True,
                stock__gt=0,
            ).exists()

        return obj.stock > 0