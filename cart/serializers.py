from rest_framework import serializers
from .models import Cart, CartItem
from shop.serializers import ProductListSerializer
from shop.models import Product, ProductAttribute


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()
    selected_attributes = serializers.JSONField(read_only=True)
    attribute_stock = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'total_price', 'selected_attributes', 'attribute_stock']

    def get_total_price(self, obj):
        return obj.get_total_price()

    def get_attribute_stock(self, obj):
        if not obj.selected_attributes:
            return obj.product.stock
        attrs = obj.product.attributes.filter(
            name__in=obj.selected_attributes.keys(),
            value__in=obj.selected_attributes.values()
        )
        if attrs.exists():
            return min(attr.stock for attr in attrs)
        return 0


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price']

    def get_total_price(self, obj):
        return obj.get_total_price()


class AddItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=999, default=1)
    selected_attributes = serializers.JSONField(required=False, default=dict)

    def validate(self, data):
        product_id = data['product_id']
        quantity = data['quantity']
        selected_attributes = data.get('selected_attributes', {})

        try:
            product = Product.objects.get(id=product_id, available=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError({'product_id': 'Товар не найден'})

        if product.attributes.exists():
            if not selected_attributes:
                raise serializers.ValidationError({'selected_attributes': 'Необходимо выбрать атрибуты'})

            for name, value in selected_attributes.items():
                attr = product.attributes.filter(name=name, value=value, available=True).first()
                if not attr:
                    raise serializers.ValidationError({f'attribute_{name}': f'Значение "{value}" недоступно'})
                if attr.stock < quantity:
                    raise serializers.ValidationError({f'attribute_{name}': f'В наличии только {attr.stock} шт.'})
        else:
            if product.stock < quantity:
                raise serializers.ValidationError({'quantity': f'В наличии только {product.stock} шт.'})

        data['product'] = product
        return data


class UpdateItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=0, max_value=999)
    selected_attributes = serializers.JSONField(required=False, default=dict)


class RemoveItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    selected_attributes = serializers.JSONField(required=False, default=dict)