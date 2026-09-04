from django.urls import path
from .views import GetWsTokenView
from .api_views import ChatMessageListView, ManagerChatRoomListView

urlpatterns = [
    path('chat/ws-token/', GetWsTokenView.as_view(), name='chat_ws_token'),
    path('chat/messages/<int:room_id>/', ChatMessageListView.as_view(), name='chat_messages'),
    path('chat/manager/rooms/', ManagerChatRoomListView.as_view(), name='manager_chat_rooms'),
]