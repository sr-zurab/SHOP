from django.db import models
from rest_framework import serializers
from .models import Product, Category, ProductImage, ProductAttribute


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'thumbnail', 'order']

    def get_image(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image_detail.url) if request else obj.image_detail.url

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url


class ProductAttributeSerializer(serializers.ModelSerializer):
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductAttribute
        fields = ['id', 'name', 'value', 'stock', 'available', 'in_stock']

    def get_in_stock(self, obj):
        return obj.in_stock


class ProductListSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    in_stock = serializers.SerializerMethodField()
    has_attributes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'price', 'thumbnail', 'category', 'in_stock', 'stock', 'has_attributes']

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_in_stock(self, obj):
        if obj.attributes.exists():
            return obj.attributes.filter(available=True, stock__gt=0).exists()
        return obj.stock > 0

    def get_has_attributes(self, obj):
        return obj.attributes.exists()


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    main_image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    grouped_attributes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price',
            'images', 'main_image', 'category', 'in_stock', 'stock', 'thumbnail',
            'average_rating', 'reviews_count', 'attributes', 'grouped_attributes',
        ]

    def get_main_image(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.image_detail.url) if request else obj.image_detail.url

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_in_stock(self, obj):
        if obj.attributes.exists():
            return obj.attributes.filter(available=True, stock__gt=0).exists()
        return obj.stock > 0

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(models.Avg('rating'))['rating__avg']
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


class ProductAttributeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = ['id', 'name', 'value', 'stock', 'available']


class ProductWriteSerializer(serializers.ModelSerializer):
    attributes = ProductAttributeWriteSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ['id', 'category', 'name', 'slug', 'description', 'price', 'available', 'stock', 'image', 'attributes']

    def create(self, validated_data):
        attributes_data = validated_data.pop('attributes', [])
        product = Product.objects.create(**validated_data)
        for attr_data in attributes_data:
            ProductAttribute.objects.create(product=product, **attr_data)
        return product

    def update(self, instance, validated_data):
        attributes_data = validated_data.pop('attributes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if attributes_data is not None:
            instance.attributes.all().delete()
            for attr_data in attributes_data:
                ProductAttribute.objects.create(product=instance, **attr_data)

        return instance


class ManagerProductSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    in_stock = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'stock',
            'available', 'thumbnail', 'category', 'in_stock', 'attributes',
        ]

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_in_stock(self, obj):
        if obj.attributes.exists():
            return obj.attributes.filter(available=True, stock__gt=0).exists()
        return obj.stock > 0