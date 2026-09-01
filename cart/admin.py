from django.contrib import admin
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['product', 'quantity']
    can_delete = False


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'session_key', 'total_price_display', 'created', 'updated']
    list_filter = ['created']
    search_fields = ['user__username', 'user__email', 'session_key']
    readonly_fields = ['created', 'updated']
    inlines = [CartItemInline]

    def total_price_display(self, obj):
        return f'{obj.get_total_price()} ₽'
    total_price_display.short_description = 'Сумма'

    def has_add_permission(self, request):
        # корзины создаются только через API, не вручную в админке
        return False