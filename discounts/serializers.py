from rest_framework import serializers

from shop.models import Category, Product

from .constants import DiscountType
from .models import Discount


class DiscountCalculationItemSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    discount_type = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    def get_id(self, obj):
        return obj.discount.id

    def get_name(self, obj):
        return obj.discount.name

    def get_discount_type(self, obj):
        return obj.discount.discount_type

    def get_value(self, obj):
        return str(obj.discount.value)


class DiscountCalculationSerializer(serializers.Serializer):
    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    discount_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    applied_discounts = DiscountCalculationItemSerializer(
        many=True,
        read_only=True,
    )


class DiscountCalculateRequestSerializer(serializers.Serializer):
    item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )


class DiscountManagerSerializer(serializers.ModelSerializer):
    products = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Product.objects.all(),
        required=False,
    )

    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        required=False,
    )

    class Meta:
        model = Discount
        fields = [
            'id',
            'name',
            'description',
            'discount_type',
            'value',
            'status',
            'starts_at',
            'ends_at',
            'priority',
            'is_stackable',
            'minimum_order_amount',
            'max_discount_amount',
            'usage_limit',
            'usage_limit_per_user',
            'products',
            'categories',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        discount_type = attrs.get(
            'discount_type',
            getattr(
                self.instance,
                'discount_type',
                None,
            ),
        )

        value = attrs.get(
            'value',
            getattr(
                self.instance,
                'value',
                None,
            ),
        )

        starts_at = attrs.get(
            'starts_at',
            getattr(
                self.instance,
                'starts_at',
                None,
            ),
        )

        ends_at = attrs.get(
            'ends_at',
            getattr(
                self.instance,
                'ends_at',
                None,
            ),
        )

        if (
            discount_type == DiscountType.PERCENT
            and value is not None
            and value > 100
        ):
            raise serializers.ValidationError({
                'value': (
                    'Процент скидки не может быть больше 100.'
                ),
            })

        if (
            starts_at is not None
            and ends_at is not None
            and ends_at <= starts_at
        ):
            raise serializers.ValidationError({
                'ends_at': (
                    'Дата окончания должна быть позже даты начала.'
                ),
            })

        return attrs