from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DiscountCalculateAPIView,
    DiscountViewSet,
)
router = DefaultRouter()
router.register(
    '',
    DiscountViewSet,
    basename='discount',
)
urlpatterns = [
    path(
        'calculate/',
        DiscountCalculateAPIView.as_view(),
        name='discount-calculate',
    ),
    path(
        '',
        include(router.urls),
    ),
]