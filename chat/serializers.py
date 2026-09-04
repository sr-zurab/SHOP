from rest_framework import serializers
from .models import ChatMessage, ChatRoom


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender_id', 'sender_username', 'is_from_manager', 'text', 'created', 'is_read']


class ChatRoomSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'username', 'created', 'is_closed', 'last_message']

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created').first()
        if not last:
            return None
        return {
            'text': last.text,
            'created': last.created.isoformat(),
            'is_from_manager': last.is_from_manager,
        }