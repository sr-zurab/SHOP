from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from .models import ChatRoom

INACTIVITY_TIMEOUT = timedelta(hours=24)


@shared_task
def close_stale_chats():
    cutoff = timezone.now() - INACTIVITY_TIMEOUT
    stale_rooms = ChatRoom.objects.filter(is_closed=False).prefetch_related('messages')

    closed_count = 0
    for room in stale_rooms:
        last_message = room.messages.order_by('-created').first()
        last_activity = last_message.created if last_message else room.created

        if last_activity < cutoff:
            room.is_closed = True
            room.save(update_fields=['is_closed'])
            closed_count += 1

    return closed_count