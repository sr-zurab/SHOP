from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
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
        return ChatRoom.objects.filter(
            is_closed=False
        ).filter(
            Q(assigned_manager__isnull=True) | Q(assigned_manager=self.request.user)
        ).select_related('user', 'assigned_manager').order_by('-created')


class AssignChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        if not request.user.is_manager:
            raise PermissionDenied('Только менеджер может брать чат в работу')

        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            raise NotFound('Чат не найден')

        if room.assigned_manager_id is not None and room.assigned_manager_id != request.user.id:
            return Response({'detail': 'Чат уже назначен другому менеджеру'}, status=400)

        room.assigned_manager = request.user
        room.save(update_fields=['assigned_manager'])

        return Response(ChatRoomSerializer(room).data)


class CloseChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            raise NotFound('Чат не найден')

        if room.user_id != request.user.id and not request.user.is_manager:
            raise PermissionDenied('Нет доступа к этому чату')

        room.is_closed = True
        room.save(update_fields=['is_closed'])

        return Response(ChatRoomSerializer(room).data)


class MarkMessagesReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            raise NotFound('Чат не найден')

        if room.user_id != request.user.id and not request.user.is_manager:
            raise PermissionDenied('Нет доступа к этому чату')

        ChatMessage.objects.filter(room=room, is_read=False).exclude(sender=request.user).update(is_read=True)

        return Response({'detail': 'ok'})