from django.contrib import admin
from .models import Order, OrderItem, OrderComment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'price', 'quantity', 'total_price_display']
    can_delete = False

    def total_price_display(self, obj):
        return f'{obj.get_total_price()} ₽'
    total_price_display.short_description = 'Сумма'


class OrderCommentInline(admin.TabularInline):
    model = OrderComment
    extra = 0
    readonly_fields = ['author', 'text', 'created']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'user', 'status', 'total_price_display', 'created']
    list_filter = ['status', 'created']
    list_editable = ['status']
    search_fields = ['full_name', 'email', 'phone', 'user__username']
    readonly_fields = ['created', 'updated']
    inlines = [OrderItemInline, OrderCommentInline]
    date_hierarchy = 'created'

    def total_price_display(self, obj):
        return f'{obj.get_total_price()} ₽'
    total_price_display.short_description = 'Сумма'


@admin.register(OrderComment)
class OrderCommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'author', 'text', 'created']
    list_filter = ['created']
    search_fields = ['text', 'order__id', 'author__username']
