from django.conf import settings
from django.db import models


class ChatRoom(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, related_name='chat_room', on_delete=models.CASCADE
    )
    assigned_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='assigned_chats',
        on_delete=models.SET_NULL, null=True, blank=True
    )
    created = models.DateTimeField(auto_now_add=True)
    is_closed = models.BooleanField(default=False)

    def __str__(self):
        return f'Чат с {self.user}'


class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_from_manager = models.BooleanField(default=False)
    text = models.CharField(max_length=2000)
    created = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created']

    def __str__(self):
        return f'{self.sender}: {self.text[:30]}'