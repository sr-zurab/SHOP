import secrets
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ChatRoom


class GetWsTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room, _ = ChatRoom.objects.get_or_create(user=request.user)

        ws_token = secrets.token_urlsafe(32)
        cache.set(f'ws_token:{ws_token}', request.user.id, timeout=30)

        return Response({'ws_token': ws_token, 'room_id': room.id})