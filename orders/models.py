from django.conf import settings
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает оплаты'
        PAID = 'paid', 'Оплачен'
        SHIPPED = 'shipped', 'Отправлен'
        DELIVERED = 'delivered', 'Доставлен'
        CANCELLED = 'cancelled', 'Отменён'

    class DeliveryMethod(models.TextChoices):
        PICKUP = 'pickup', 'Самовывоз'
        COURIER = 'courier', 'Курьером'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders',
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    delivery_method = models.CharField(
        max_length=20,
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.COURIER,
    )

    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.CharField(
        max_length=500,
        blank=True,
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    discount_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    manager_seen = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created']

    def get_total_price(self):
        return self.total_price

    def __str__(self):
        return (
            f'Заказ #{self.id} '
            f'({self.get_status_display()})'
        )


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        related_name='items',
        on_delete=models.CASCADE,
    )

    product = models.ForeignKey(
        'shop.Product',
        on_delete=models.SET_NULL,
        null=True,
    )

    variant = models.ForeignKey(
        'shop.ProductVariant',
        related_name='order_items',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    product_name = models.CharField(max_length=200)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    quantity = models.PositiveIntegerField(default=1)

    selected_attributes = models.JSONField(
        default=dict,
        blank=True,
    )

    def get_total_price(self):
        return self.price * self.quantity

    def __str__(self):
        return (
            f'{self.product_name} x{self.quantity}'
        )


class OrderComment(models.Model):
    order = models.ForeignKey(
        Order,
        related_name='comments',
        on_delete=models.CASCADE,
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_comments',
    )

    text = models.CharField(max_length=2000)

    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created']

    def __str__(self):
        return f'Комментарий к заказу #{self.order_id}'