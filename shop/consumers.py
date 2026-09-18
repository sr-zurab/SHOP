import json

from channels.generic.websocket import AsyncWebsocketConsumer


class ProductStockConsumer(AsyncWebsocketConsumer):
    group_name = 'product_stock'

    async def connect(self):
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

    async def product_stock_updated(self, event):
        await self.send(
            text_data=json.dumps({
                'type': 'product_stock_updated',
                'product_id': event['product_id'],
                'stock': event['stock'],
                'in_stock': event['in_stock'],
                'available': event.get('available', True),
                'has_attributes': event.get('has_attributes', False),
                'attributes': event.get('attributes', []),
            })
        )