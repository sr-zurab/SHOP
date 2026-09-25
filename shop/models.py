from django.core.exceptions import ValidationError
from django.db import models
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill, ResizeToFit


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True)
    parent = models.ForeignKey(
        'self',
        related_name='children',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['parent']),
        ]
        verbose_name = 'категория'
        verbose_name_plural = 'категории'

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()

        if self.parent_id is None:
            return

        if self.pk == self.parent_id:
            raise ValidationError({
                'parent': 'Категория не может быть родителем самой себя.'
            })

        parent = self.parent

        while parent is not None:
            if parent.pk == self.pk:
                raise ValidationError({
                    'parent': 'Нельзя создать циклическую структуру категорий.'
                })

            parent = parent.parent


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        related_name='products',
        on_delete=models.PROTECT,
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    image = models.ImageField(
        upload_to='products/%Y/%m/%d',
        blank=True,
    )
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    available = models.BooleanField(default=True)
    stock = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    thumbnail = ImageSpecField(
        source='image',
        processors=[ResizeToFill(150, 150)],
        format='JPEG',
        options={'quality': 80},
    )

    image_detail = ImageSpecField(
        source='image',
        processors=[ResizeToFit(800, 800)],
        format='JPEG',
        options={'quality': 85},
    )

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-created']),
            models.Index(fields=['available']),
        ]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='images',
        on_delete=models.CASCADE,
    )
    image = models.ImageField(
        upload_to='products/gallery/%Y/%m/%d',
    )
    order = models.PositiveIntegerField(default=0)

    thumbnail = ImageSpecField(
        source='image',
        processors=[ResizeToFill(400, 400)],
        format='JPEG',
        options={'quality': 85},
    )

    image_detail = ImageSpecField(
        source='image',
        processors=[ResizeToFit(800, 800)],
        format='JPEG',
        options={'quality': 85},
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name}, изображение {self.order}'


class ProductAttribute(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='attributes',
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=100)
    available = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'name', 'value'],
                name='unique_product_attribute_value',
            ),
        ]
        indexes = [
            models.Index(fields=['available']),
            models.Index(fields=['product', 'name']),
        ]

    def __str__(self):
        return f'{self.product.name} — {self.name}: {self.value}'


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='variants',
        on_delete=models.CASCADE,
    )
    attributes = models.JSONField(default=dict)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    available = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'attributes'],
                name='unique_product_variant_attributes',
            ),
        ]
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['available']),
            models.Index(fields=['product', 'available']),
        ]

    def __str__(self):
        if not self.attributes:
            return f'{self.product.name} — вариант'

        attributes_text = ', '.join(
            f'{name}: {value}'
            for name, value in self.attributes.items()
        )

        return f'{self.product.name} — {attributes_text}'

    @property
    def in_stock(self):
        return self.available and self.stock > 0