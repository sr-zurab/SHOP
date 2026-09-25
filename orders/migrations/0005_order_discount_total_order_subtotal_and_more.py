from decimal import Decimal

from django.db import migrations, models


def populate_order_totals(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    OrderItem = apps.get_model('orders', 'OrderItem')

    for order in Order.objects.all().iterator():
        subtotal = Decimal('0.00')

        for item in OrderItem.objects.filter(order_id=order.pk):
            subtotal += item.price * item.quantity

        order.subtotal = subtotal
        order.discount_total = Decimal('0.00')
        order.total_price = subtotal

        order.save(
            update_fields=[
                'subtotal',
                'discount_total',
                'total_price',
            ]
        )


def reset_order_totals(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')

    Order.objects.all().update(
        subtotal=Decimal('0.00'),
        discount_total=Decimal('0.00'),
        total_price=Decimal('0.00'),
    )


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_orderitem_selected_attributes'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='discount_total',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='subtotal',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='total_price',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10,
            ),
        ),
        migrations.RunPython(
            populate_order_totals,
            reset_order_totals,
        ),
    ]