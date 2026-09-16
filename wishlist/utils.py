from .models import Wishlist


def get_wishlist_queryset(request):
    if request.user.is_authenticated:
        return Wishlist.objects.filter(user=request.user)

    if not request.session.session_key:
        request.session.create()
    return Wishlist.objects.filter(session_key=request.session.session_key)


def merge_wishlist(request, user):
    session_key = request.session.session_key
    if not session_key:
        return

    anon_items = list(
        Wishlist.objects.filter(session_key=session_key)
        .select_related('product')
    )
    if not anon_items:
        return

    existing_product_ids = set(
        Wishlist.objects.filter(user=user).values_list('product_id', flat=True)
    )

    for item in anon_items:
        if item.product_id in existing_product_ids:
            continue
        Wishlist.objects.create(user=user, product=item.product)

    Wishlist.objects.filter(session_key=session_key).delete()
