from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'price', 'quantity', 'total_price_display']
    can_delete = False

    def total_price_display(self, obj):
        return f'{obj.get_total_price()} ₽'
    total_price_display.short_description = 'Сумма'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'user', 'status', 'total_price_display', 'created']
    list_filter = ['status', 'created']
    list_editable = ['status']  # менять статус заказа прямо из списка — часто нужно
    search_fields = ['full_name', 'email', 'phone', 'user__username']
    readonly_fields = ['created', 'updated']
    inlines = [OrderItemInline]
    date_hierarchy = 'created'  # удобная навигация по датам заказов

    def total_price_display(self, obj):
        return f'{obj.get_total_price()} ₽'
    total_price_display.short_description = 'Сумма'