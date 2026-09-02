from rest_framework import serializers
from .models import Product, Category, ProductImage

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
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url

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

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'images', 'category', 'in_stock', 'stock', 'thumbnail']

    def get_thumbnail(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_in_stock(self, obj):
        return obj.stock > 0