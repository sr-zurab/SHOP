from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                'ALTER TABLE chat_chatmessage '
                'ADD COLUMN IF NOT EXISTS is_from_manager boolean '
                'NOT NULL DEFAULT false; '
                'UPDATE chat_chatmessage '
                'SET is_from_manager = is_from_staff '
                'WHERE is_from_staff IS NOT NULL; '
                'ALTER TABLE chat_chatmessage '
                'DROP COLUMN IF EXISTS is_from_staff'
            ),
            reverse_sql=(
                'ALTER TABLE chat_chatmessage '
                'ADD COLUMN IF NOT EXISTS is_from_staff boolean '
                'NOT NULL DEFAULT false; '
                'UPDATE chat_chatmessage '
                'SET is_from_staff = is_from_manager '
                'WHERE is_from_manager IS NOT NULL; '
                'ALTER TABLE chat_chatmessage '
                'DROP COLUMN IF EXISTS is_from_manager'
            ),
        ),
    ]
