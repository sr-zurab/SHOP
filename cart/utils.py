from .models import Cart, CartItem


def get_or_create_cart(request):
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    if not request.session.session_key:
        request.session.create()

    cart, _ = Cart.objects.get_or_create(
        user=None, session_key=request.session.session_key
    )
    return cart


def merge_cart(request, user):
    """Переносит анонимную корзину (по session_key) в корзину залогиненного пользователя."""
    session_key = request.session.session_key
    if not session_key:
        return

    try:
        anon_cart = Cart.objects.get(user=None, session_key=session_key)
    except Cart.DoesNotExist:
        return

    user_cart, _ = Cart.objects.get_or_create(user=user)

    for item in anon_cart.items.select_related('product'):
        existing, created = CartItem.objects.get_or_create(
            cart=user_cart, product=item.product,
            defaults={'quantity': item.quantity}
        )
        if not created:
            new_quantity = existing.quantity + item.quantity
            # не превышаем остаток при слиянии
            existing.quantity = min(new_quantity, item.product.stock)
            existing.save()

    anon_cart.delete()