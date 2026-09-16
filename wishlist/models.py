from django.conf import settings
from django.db import models


class Wishlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='wishlist',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    product = models.ForeignKey(
        'shop.Product', related_name='wishlisted_by', on_delete=models.CASCADE
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'product'],
                condition=models.Q(user__isnull=False),
                name='unique_user_wishlist'
            ),
            models.UniqueConstraint(
                fields=['session_key', 'product'],
                condition=models.Q(user__isnull=True),
                name='unique_anon_wishlist'
            ),
        ]

    def __str__(self):
        return f'{self.user or self.session_key} — {self.product.name}'