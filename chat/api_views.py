from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from .models import ChatMessage, ChatRoom
from .serializers import ChatMessageSerializer, ChatRoomSerializer


class ChatMessageListView(ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['room_id']
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            raise NotFound('Чат не найден')

        if room.user_id != self.request.user.id and not self.request.user.is_manager:
            raise PermissionDenied('Нет доступа к этому чату')

        return ChatMessage.objects.filter(room_id=room_id)


class ManagerChatRoomListView(ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_manager:
            return ChatRoom.objects.none()
        return ChatRoom.objects.filter(is_closed=False).select_related('user').order_by('-created')