from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


@database_sync_to_async
def get_user_from_ws_token(ws_token):
    user_id = cache.get(f'ws_token:{ws_token}')
    if not user_id:
        return AnonymousUser()

    cache.delete(f'ws_token:{ws_token}')

    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class WsTokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        ws_token = params.get('ws_token', [None])[0]

        if ws_token:
            scope['user'] = await get_user_from_ws_token(ws_token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)