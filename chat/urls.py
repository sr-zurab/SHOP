from django.urls import path
from .views import GetWsTokenView
from .api_views import (
    ChatMessageListView, ChatUnreadCountView, ManagerChatRoomListView,
    AssignChatRoomView, CloseChatRoomView, MarkMessagesReadView,
)

urlpatterns = [
    path('chat/ws-token/', GetWsTokenView.as_view(), name='chat_ws_token'),
    path('chat/messages/<int:room_id>/', ChatMessageListView.as_view(), name='chat_messages'),
    path('chat/unread-count/', ChatUnreadCountView.as_view(), name='chat_unread_count'),
    path('chat/manager/rooms/', ManagerChatRoomListView.as_view(), name='manager_chat_rooms'),
    path('chat/rooms/<int:room_id>/assign/', AssignChatRoomView.as_view(), name='chat_assign'),
    path('chat/rooms/<int:room_id>/close/', CloseChatRoomView.as_view(), name='chat_close'),
    path('chat/rooms/<int:room_id>/mark-read/', MarkMessagesReadView.as_view(), name='chat_mark_read'),
]