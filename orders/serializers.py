from rest_framework import serializers

from .models import Order, OrderItem, OrderComment


class OrderItemSerializer(serializers.ModelSerializer):
    selected_attributes = serializers.JSONField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'price',
            'quantity',
            'selected_attributes',
        ]


class OrderCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source='author.username',
        read_only=True,
        default=''
    )

    class Meta:
        model = OrderComment
        fields = [
            'id',
            'author_username',
            'text',
            'created',
        ]
        read_only_fields = [
            'id',
            'author_username',
            'created',
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    comments = OrderCommentSerializer(
        many=True,
        read_only=True
    )

    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Order
        fields = [
            'id',
            'status',
            'status_display',
            'delivery_method',
            'full_name',
            'email',
            'phone',
            'address',
            'items',
            'comments',
            'subtotal',
            'discount_total',
            'total_price',
            'created',
            'updated',
        ]

        read_only_fields = [
            'status',
            'subtotal',
            'discount_total',
            'total_price',
        ]


class ManagerOrderSerializer(OrderSerializer):
    username = serializers.CharField(
        source='user.username',
        read_only=True,
        default=''
    )

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + [
            'username',
            'user',
        ]


class CreateOrderSerializer(serializers.Serializer):
    delivery_method = serializers.ChoiceField(
        choices=Order.DeliveryMethod.choices
    )

    full_name = serializers.CharField(
        max_length=200
    )

    email = serializers.EmailField()

    phone = serializers.CharField(
        max_length=20
    )

    address = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True
    )

    def validate(self, data):
        if (
            data['delivery_method']
            == Order.DeliveryMethod.COURIER
            and not data.get('address')
        ):
            raise serializers.ValidationError({
                'address': 'Укажите адрес доставки'
            })

        return data


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Order.Status.choices
    )


class CreateOrderCommentSerializer(serializers.Serializer):
    text = serializers.CharField(
        max_length=2000
    )

    def validate_text(self, value):
        text = value.strip()

        if not text:
            raise serializers.ValidationError(
                'Комментарий не может быть пустым'
            )

        return text