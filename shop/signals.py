import os
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from .models import Product, ProductImage


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