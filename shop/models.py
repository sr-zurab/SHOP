from django.db import models
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill

class Category (models.Model):
    name = models.CharField(max_length = 200)
    slug = models.SlugField(max_length = 200, unique = True)
    
    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields = ['name']),]
        verbose_name = 'категория'
        verbose_name_plural = 'категории'

    def __str__(self):
        return self.name

class Product (models.Model):
    category = models.ForeignKey(Category, related_name = 'products', on_delete = models.CASCADE)
    name = models.CharField(max_length = 200)
    slug = models.SlugField(max_length = 200)
    image = models.ImageField(upload_to = 'products /%Y/%m/%d', blank = True)
    description = models.TextField(blank = True)
    price = models.DecimalField(max_digits = 10, decimal_places = 2)
    available = models.BooleanField(default = True)
    stock = models.PositiveIntegerField(default = 0)
    created = models.DateTimeField(auto_now_add = True)
    updated = models.DateTimeField(auto_now_add = True)
    # Поле миниатюры
    thumbnail = ImageSpecField(source = 'image', 
                               processors = [ResizeToFill(150,150)], 
                               format = 'JPEG', options = {'quality':80},
                               )
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields = ['id', 'slug']),
            models.Index(fields = ['name']),
            models.Index(fields = ['-created']),
        ]
    def __str__(self):
        return self.name

class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, related_name = 'images',
        on_delete = models.CASCADE
    )
    image = models.ImageField(upload_to = 'products/gallery/%Y/%m/%d')
    order = models.PositiveIntegerField(default = 0)
    thumbnail = ImageSpecField(
        source = 'image',
        processors = [ResizeToFill(400,400)],
        format = 'JPEG',
        options = {'quality':85},
    )
    class Meta:
        ordering = ['order']
    def __str__(self):
        return f'{self.product.name} -, изображение {self.order}'