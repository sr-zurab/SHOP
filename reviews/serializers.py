from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'username', 'rating', 'text', 'created']
        read_only_fields = ['id', 'username', 'created']


class CreateReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['product', 'rating', 'text']

    def validate(self, data):
        user = self.context['request'].user
        product = data['product']

        # Проверка: пользователь покупал этот товар
        from orders.models import OrderItem
        has_purchased = OrderItem.objects.filter(
            order__user=user, product=product
        ).exists()
        if not has_purchased:
            raise serializers.ValidationError(
                'Оставить отзыв можно только на купленный товар'
            )

        # Проверка: отзыв ещё не оставлен
        if Review.objects.filter(product=product, user=user).exists():
            raise serializers.ValidationError('Вы уже оставили отзыв на этот товар')

        return data