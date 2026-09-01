from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'order', 'thumbnail_preview']
    readonly_fields = ['thumbnail_preview']

    def thumbnail_preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" style="max-height: 60px;" />', obj.thumbnail.url)
        return '—'
    thumbnail_preview.short_description = 'Превью'


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'available', 'thumbnail_preview', 'created']
    list_filter = ['available', 'category', 'created']
    list_editable = ['price', 'stock', 'available']  # быстрое редактирование прямо из списка
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline]
    readonly_fields = ['created', 'updated', 'thumbnail_preview']
    list_per_page = 50

    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 60px;" />', obj.thumbnail.url)
        return '—'
    thumbnail_preview.short_description = 'Превью'