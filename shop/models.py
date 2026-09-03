from django.db import models
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill, ResizeToFit


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)

    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['name'])]
        verbose_name = 'категория'
        verbose_name_plural = 'категории'

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    image = models.ImageField(upload_to='products/%Y/%m/%d', blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    available = models.BooleanField(default=True)
    stock = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    # Миниатюра для карточек товара / списка
    thumbnail = ImageSpecField(
        source='image',
        processors=[ResizeToFill(150, 150)],
        format='JPEG',
        options={'quality': 80},
    )

    # Оптимизированная версия для главного фото на странице товара —
    # вписывается в рамку 800x800 с сохранением пропорций, без обрезки
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
        Product, related_name='images',
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to='products/gallery/%Y/%m/%d')
    order = models.PositiveIntegerField(default=0)

    thumbnail = ImageSpecField(
        source='image',
        processors=[ResizeToFill(400, 400)],
        format='JPEG',
        options={'quality': 85},
    )

    # То же — оптимизированная версия для показа как главное фото в галерее
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