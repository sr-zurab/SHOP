from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('sekretnaya-panel-upravleniya-shop2026/', admin.site.urls),
    path('api/', include('shop.urls')),
    path('api/', include('cart.urls')),
    path('api/', include('orders.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('wishlist.urls')),
    path('api/', include('reviews.urls')),
    path('api/', include('chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)