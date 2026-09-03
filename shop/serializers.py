from django.db import models
from rest_framework import serializers
from .models import Product, Category, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()  # теперь отдаёт image_detail, не оригинал
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


class ProductListSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'price', 'thumbnail', 'category', 'in_stock', 'stock']

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_in_stock(self, obj):
        return obj.stock > 0


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    thumbnail = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price',
            'images', 'category', 'in_stock', 'stock', 'thumbnail',
            'average_rating', 'reviews_count',
        ]

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_in_stock(self, obj):
        return obj.stock > 0

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(models.Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None

    def get_reviews_count(self, obj):
        return obj.reviews.count()