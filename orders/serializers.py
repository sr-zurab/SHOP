from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'price', 'quantity']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'delivery_method', 'full_name', 'email', 'phone', 'address',
            'items', 'total_price', 'created',
        ]
        read_only_fields = ['status']

    def get_total_price(self, obj):
        return obj.get_total_price()


class CreateOrderSerializer(serializers.Serializer):
    delivery_method = serializers.ChoiceField(choices=Order.DeliveryMethod.choices)
    full_name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        if data['delivery_method'] == Order.DeliveryMethod.COURIER and not data.get('address'):
            raise serializers.ValidationError({'address': 'Укажите адрес доставки'})
        return data