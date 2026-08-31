from django.db import models
from django.conf import settings

class Cart (models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        null=True,
        blank=True
    )
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ['session_key'],
                condition = models.Q(user__isnull = True),
                name = 'unique_anon_cart'
            )
        ]
    def get_total_price(self):
        return sum(item.get_total_price() for item in self.items.all())

class CartItem (models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete = models.CASCADE)
    product = models.ForeignKey('shop.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product')

    def get_total_price(self):
        return self.product.price*self.quantity