from django.contrib import admin
from .models import ChatRoom, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ['sender', 'is_from_manager', 'text', 'created']
    can_delete = False


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['user', 'assigned_manager', 'is_closed', 'created']
    list_filter = ['is_closed']
    inlines = [ChatMessageInline]