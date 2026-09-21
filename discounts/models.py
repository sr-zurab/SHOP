from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from shop.models import Category, Product

from .constants import DiscountStatus, DiscountType


class Discount(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
    )

    value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.01')),
        ],
    )

    status = models.CharField(
        max_length=20,
        choices=DiscountStatus.choices,
        default=DiscountStatus.DRAFT,
        db_index=True,
    )

    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField(db_index=True)

    priority = models.PositiveIntegerField(default=0)

    is_stackable = models.BooleanField(default=False)

    minimum_order_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal('0.00')),
        ],
    )

    max_discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal('0.01')),
        ],
    )

    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    usage_limit_per_user = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    products = models.ManyToManyField(
        Product,
        blank=True,
        related_name='discounts',
    )

    categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name='discounts',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'starts_at', 'ends_at']),
            models.Index(fields=['priority']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F('starts_at')),
                name='discount_ends_after_starts',
            ),
            models.CheckConstraint(
                condition=models.Q(value__gt=0),
                name='discount_value_positive',
            ),
        ]
        verbose_name = 'скидка'
        verbose_name_plural = 'скидки'

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()

        if self.starts_at and self.ends_at:
            if self.ends_at <= self.starts_at:
                raise ValidationError({
                    'ends_at': 'Дата окончания должна быть позже даты начала.'
                })

        if self.discount_type == DiscountType.PERCENT:
            if self.value > Decimal('100'):
                raise ValidationError({
                    'value': 'Процент скидки не может быть больше 100.'
                })

    def is_time_active(self, now=None):
        """
        Проверяет только временное окно действия скидки.
        """
        if now is None:
            now = timezone.now()

        return self.starts_at <= now < self.ends_at

    def is_active(self, now=None):
        """
        Проверяет, может ли скидка считаться активной.
        """
        if self.status != DiscountStatus.ACTIVE:
            return False

        return self.is_time_active(now)

class PromoCode(models.Model):
    discount = models.ForeignKey(
        Discount,
        related_name='promo_codes',
        on_delete=models.CASCADE,
    )

    code = models.CharField(
    max_length=100,
    unique=True,
    )

    is_active = models.BooleanField(default=True)

    starts_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    ends_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    usage_limit_per_user = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        indexes = [
            models.Index(fields=['discount', 'is_active']),
        ]
        verbose_name = 'промокод'
        verbose_name_plural = 'промокоды'

    def __str__(self):
        return self.code

    def clean(self):
        super().clean()

        if self.code:
            self.code = self.code.strip().upper()

        if self.starts_at and self.ends_at:
            if self.ends_at <= self.starts_at:
                raise ValidationError({
                    'ends_at': 'Дата окончания должна быть позже даты начала.'
                })

    def is_time_active(self, now=None):
        if now is None:
            now = timezone.now()

        if self.starts_at and now < self.starts_at:
            return False

        if self.ends_at and now >= self.ends_at:
            return False

        return True

    def is_active_now(self, now=None):
        return (
            self.is_active
            and self.discount.is_active(now)
            and self.is_time_active(now)
        )

class DiscountUsage(models.Model):
    discount = models.ForeignKey(
        Discount,
        related_name='usages',
        on_delete=models.PROTECT,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='discount_usages',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    order = models.ForeignKey(
        'orders.Order',
        related_name='discount_usages',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    promo_code = models.ForeignKey(
        PromoCode,
        related_name='usages',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00')),
        ],
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['discount', 'created_at']),
            models.Index(fields=['user', 'discount', 'created_at']),
        ]
        verbose_name = 'использование скидки'
        verbose_name_plural = 'использования скидок'

    def __str__(self):
        return f'{self.discount.name} — {self.discount_amount}'