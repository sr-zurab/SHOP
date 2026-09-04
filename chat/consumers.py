import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from .models import ChatRoom, ChatMessage

MAX_MESSAGE_LENGTH = 2000
RATE_LIMIT_MESSAGES = 10
RATE_LIMIT_WINDOW = 10  # секунд


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        room_id = self.scope['url_route']['kwargs']['room_id']

        has_access = await self.check_room_access(room_id)
        if not has_access:
            await self.close(code=4003)
            return

        self.room_group_name = f'chat_{room_id}'
        self.room_id = room_id

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        text = data.get('text', '').strip()
        if not text or len(text) > MAX_MESSAGE_LENGTH:
            return

        if not await self.check_rate_limit():
            await self.send(text_data=json.dumps({'error': 'Слишком много сообщений, подождите'}))
            return

        message = await self.save_message(text)

        payload = {
            'type': 'chat_message',
            'id': message.id,
            'room_id': self.room_id,
            'sender_id': self.user.id,
            'sender_username': self.user.username,
            'is_from_manager': self.user.is_manager,
            'text': message.text,
            'created': message.created.isoformat(),
        }

        await self.channel_layer.group_send(self.room_group_name, payload)

        if not self.user.is_manager:
            await self.channel_layer.group_send('managers_notifications', payload)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def check_room_access(self, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return False

        if room.user_id == self.user.id:
            return True

        if self.user.is_manager and (room.assigned_manager_id is None or room.assigned_manager_id == self.user.id):
            return True

        return False

    @database_sync_to_async
    def check_rate_limit(self):
        key = f'chat_rate:{self.user.id}'
        now = time.time()

        timestamps = cache.get(key, [])
        timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]

        if len(timestamps) >= RATE_LIMIT_MESSAGES:
            return False

        timestamps.append(now)
        cache.set(key, timestamps, timeout=RATE_LIMIT_WINDOW)
        return True

    @database_sync_to_async
    def save_message(self, text):
        room = ChatRoom.objects.get(id=self.room_id)
        return ChatMessage.objects.create(
            room=room,
            sender=self.user,
            is_from_manager=self.user.is_manager,
            text=text,
        )


class ManagerNotificationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated or not self.user.is_manager:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add('managers_notifications', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('managers_notifications', self.channel_name)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))