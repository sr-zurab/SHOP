from django.conf import settings
from django.db import models


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        null=True,
        blank=True,
    )
    session_key = models.CharField(
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['session_key'],
                condition=models.Q(user__isnull=True),
                name='unique_anon_cart',
            ),
        ]

    def get_total_price(self):
        return sum(
            item.get_total_price()
            for item in self.items.all()
        )


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        related_name='items',
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        'shop.Product',
        on_delete=models.CASCADE,
    )
    variant = models.ForeignKey(
        'shop.ProductVariant',
        related_name='cart_items',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    quantity = models.PositiveIntegerField(default=1)
    selected_attributes = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'cart',
                    'product',
                    'variant',
                    'selected_attributes',
                ],
                name='unique_cart_item_variant',
            ),
        ]

    def get_unit_price(self):
        if self.variant_id is not None:
            return self.variant.price

        return self.product.price

    def get_total_price(self):
        return self.get_unit_price() * self.quantity

    def get_stock(self):
        if self.variant_id is not None:
            return self.variant.stock

        return self.product.stock

    def is_in_stock(self):
        if self.variant_id is not None:
            return self.variant.in_stock

        return self.product.available and self.product.stock > 0