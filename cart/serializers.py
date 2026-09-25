from rest_framework import serializers

from shop.models import Product, ProductVariant
from shop.serializers import ProductListSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    variant = serializers.PrimaryKeyRelatedField(read_only=True)
    total_price = serializers.SerializerMethodField()
    selected_attributes = serializers.JSONField(read_only=True)
    attribute_stock = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id',
            'product',
            'variant',
            'quantity',
            'total_price',
            'selected_attributes',
            'attribute_stock',
        ]

    def get_total_price(self, obj):
        return obj.get_total_price()

    def get_attribute_stock(self, obj):
        return obj.get_stock()


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(
        many=True,
        read_only=True,
    )
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            'id',
            'items',
            'total_price',
        ]

    def get_total_price(self, obj):
        return obj.get_total_price()


class AddItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(
        min_value=1,
        max_value=999,
        default=1,
    )
    selected_attributes = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate(self, data):
        product_id = data['product_id']
        quantity = data['quantity']
        selected_attributes = data.get(
            'selected_attributes',
            {},
        )

        try:
            product = Product.objects.get(
                id=product_id,
                available=True,
            )
        except Product.DoesNotExist:
            raise serializers.ValidationError({
                'product_id': 'Товар не найден',
            })

        variants_exist = product.variants.exists()

        if variants_exist:
            if not selected_attributes:
                raise serializers.ValidationError({
                    'selected_attributes': (
                        'Необходимо выбрать атрибуты'
                    ),
                })

            normalized_attributes = {
                str(name).strip(): str(value).strip()
                for name, value in selected_attributes.items()
            }

            variants = product.variants.filter(
                available=True,
            )

            variant = None

            for candidate in variants:
                candidate_attributes = {
                    str(name).strip(): str(value).strip()
                    for name, value in candidate.attributes.items()
                }

                if candidate_attributes == normalized_attributes:
                    variant = candidate
                    break

            if variant is None:
                raise serializers.ValidationError({
                    'selected_attributes': (
                        'Выбранная комбинация атрибутов '
                        'недоступна'
                    ),
                })

            if variant.stock < quantity:
                raise serializers.ValidationError({
                    'quantity': (
                        f'В наличии только '
                        f'{variant.stock} шт.'
                    ),
                })

            data['selected_attributes'] = normalized_attributes
            data['variant'] = variant

        else:
            if selected_attributes:
                raise serializers.ValidationError({
                    'selected_attributes': (
                        'У этого товара нет вариантов '
                        'с атрибутами'
                    ),
                })

            if product.stock < quantity:
                raise serializers.ValidationError({
                    'quantity': (
                        f'В наличии только '
                        f'{product.stock} шт.'
                    ),
                })

            data['selected_attributes'] = {}
            data['variant'] = None

        data['product'] = product

        return data


class UpdateItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(
        min_value=0,
        max_value=999,
    )
    selected_attributes = serializers.JSONField(
        required=False,
        default=dict,
    )


class RemoveItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    selected_attributes = serializers.JSONField(
        required=False,
        default=dict,
    )