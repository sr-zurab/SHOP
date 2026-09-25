from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import (
    Product,
    ProductAttribute,
    ProductImage,
    ProductVariant,
)


def _delete_file(field_file):
    if not field_file or not field_file.name:
        return

    try:
        if field_file.storage.exists(field_file.name):
            field_file.storage.delete(field_file.name)
    except Exception:
        pass


def _delete_imagekit_cache(instance):
    for spec_name in ('thumbnail', 'image_detail'):
        spec = getattr(instance, spec_name, None)

        if spec is None:
            continue

        try:
            if spec.storage.exists(spec.name):
                spec.storage.delete(spec.name)
        except Exception:
            pass


@receiver(post_delete, sender=Product)
def cleanup_product_media(sender, instance, **kwargs):
    if instance.image:
        _delete_imagekit_cache(instance)
        _delete_file(instance.image)


@receiver(post_delete, sender=ProductImage)
def cleanup_product_gallery_media(sender, instance, **kwargs):
    if instance.image:
        _delete_imagekit_cache(instance)
        _delete_file(instance.image)


@receiver(pre_save, sender=Product)
def delete_old_product_image_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_instance = Product.objects.get(pk=instance.pk)
    except Product.DoesNotExist:
        return

    if old_instance.image and old_instance.image != instance.image:
        _delete_imagekit_cache(old_instance)
        _delete_file(old_instance.image)


def send_product_stock_update(product_id):
    def send():
        try:
            product = (
                Product.objects
                .prefetch_related(
                    'attributes',
                    'variants',
                )
                .get(pk=product_id)
            )
        except Product.DoesNotExist:
            return

        attributes = [
            {
                'id': attr.id,
                'name': attr.name,
                'value': attr.value,
                'available': attr.available,
            }
            for attr in product.attributes.all()
        ]

        variants = [
            {
                'id': variant.id,
                'attributes': variant.attributes,
                'price': variant.price,
                'stock': variant.stock,
                'available': variant.available,
                'in_stock': (
                    variant.available
                    and variant.stock > 0
                ),
            }
            for variant in product.variants.all()
        ]

        has_attributes = bool(attributes)

        if variants:
            in_stock = any(
                variant['available']
                and variant['stock'] > 0
                for variant in variants
            )
        else:
            in_stock = product.stock > 0

        channel_layer = get_channel_layer()

        if channel_layer is None:
            return

        try:
            async_to_sync(
                channel_layer.group_send
            )(
                'product_stock',
                {
                    'type': 'product_stock_updated',
                    'product_id': product.id,
                    'stock': product.stock,
                    'in_stock': in_stock,
                    'available': product.available,
                    'has_attributes': has_attributes,
                    'attributes': attributes,
                    'variants': variants,
                },
            )
        except Exception:
            pass

    transaction.on_commit(send)


@receiver(post_save, sender=Product)
def product_saved(sender, instance, **kwargs):
    send_product_stock_update(instance.pk)


@receiver(post_save, sender=ProductAttribute)
def product_attribute_saved(sender, instance, **kwargs):
    send_product_stock_update(instance.product_id)


@receiver(post_delete, sender=ProductAttribute)
def product_attribute_deleted(sender, instance, **kwargs):
    send_product_stock_update(instance.product_id)


@receiver(post_save, sender=ProductVariant)
def product_variant_saved(sender, instance, **kwargs):
    send_product_stock_update(instance.product_id)


@receiver(post_delete, sender=ProductVariant)
def product_variant_deleted(sender, instance, **kwargs):
    send_product_stock_update(instance.product_id)