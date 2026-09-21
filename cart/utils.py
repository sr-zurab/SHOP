from .models import Cart, CartItem


def get_or_create_cart(request):
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    if not request.session.session_key:
        request.session.create()

    cart, _ = Cart.objects.get_or_create(
        user=None,
        session_key=request.session.session_key
    )
    return cart


def merge_cart(request, user):
    """Переносит анонимную корзину в корзину залогиненного пользователя."""
    session_key = request.session.session_key

    if not session_key:
        return

    try:
        anon_cart = Cart.objects.get(
            user=None,
            session_key=session_key
        )
    except Cart.DoesNotExist:
        return

    user_cart, _ = Cart.objects.get_or_create(user=user)

    for item in anon_cart.items.select_related('product'):
        existing, created = CartItem.objects.get_or_create(
            cart=user_cart,
            product=item.product,
            selected_attributes=item.selected_attributes,
            defaults={
                'quantity': item.quantity
            }
        )

        if not created:
            new_quantity = existing.quantity + item.quantity

            if item.selected_attributes:
                attrs = item.product.attributes.filter(
                    name__in=item.selected_attributes.keys(),
                    value__in=item.selected_attributes.values(),
                    available=True
                )
                max_stock = min(
                    (attr.stock for attr in attrs),
                    default=0
                )
            else:
                max_stock = item.product.stock

            existing.quantity = min(new_quantity, max_stock)
            existing.save()

    anon_cart.delete()