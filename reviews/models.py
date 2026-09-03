from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):
    product = models.ForeignKey(
        'shop.Product', related_name='reviews', on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='reviews', on_delete=models.CASCADE
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    text = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'user')  # один отзыв на товар от пользователя
        ordering = ['-created']

    def __str__(self):
        return f'{self.user} — {self.product.name} ({self.rating}★)'