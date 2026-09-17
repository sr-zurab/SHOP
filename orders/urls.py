from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, ManagerOrderListView, ManagerOrderDetailView,
    ManagerOrderStatusView, ManagerOrderCommentView, ManagerOrderUnreadCountView,
    MarkManagerOrdersReadView,
)

router = DefaultRouter()
router.register('orders', OrderViewSet, basename='order')

urlpatterns = [
    path('orders/manager/', ManagerOrderListView.as_view(), name='manager_orders'),
    path('orders/manager/unread-count/', ManagerOrderUnreadCountView.as_view(), name='manager_orders_unread_count'),
    path('orders/manager/mark-read/', MarkManagerOrdersReadView.as_view(), name='manager_orders_mark_read'),
    path('orders/manager/<int:pk>/', ManagerOrderDetailView.as_view(), name='manager_order_detail'),
    path('orders/manager/<int:pk>/status/', ManagerOrderStatusView.as_view(), name='manager_order_status'),
    path('orders/manager/<int:pk>/comments/', ManagerOrderCommentView.as_view(), name='manager_order_comments'),
] + router.urls
