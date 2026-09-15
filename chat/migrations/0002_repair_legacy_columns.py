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
                'DO $$ '
                'BEGIN '
                'IF EXISTS ( '
                'SELECT 1 FROM information_schema.columns '
                'WHERE table_name = \'chat_chatmessage\' '
                'AND column_name = \'is_from_staff\' '
                ') THEN '
                'UPDATE chat_chatmessage '
                'SET is_from_manager = is_from_staff '
                'WHERE is_from_staff IS NOT NULL; '
                'END IF; '
                'END $$; '
                'ALTER TABLE chat_chatmessage '
                'DROP COLUMN IF EXISTS is_from_staff'
            ),
            reverse_sql=(
                'ALTER TABLE chat_chatmessage '
                'ADD COLUMN IF NOT EXISTS is_from_staff boolean '
                'NOT NULL DEFAULT false; '
                'DO $$ '
                'BEGIN '
                'IF EXISTS ( '
                'SELECT 1 FROM information_schema.columns '
                'WHERE table_name = \'chat_chatmessage\' '
                'AND column_name = \'is_from_manager\' '
                ') THEN '
                'UPDATE chat_chatmessage '
                'SET is_from_staff = is_from_manager '
                'WHERE is_from_manager IS NOT NULL; '
                'END IF; '
                'END $$; '
                'ALTER TABLE chat_chatmessage '
                'DROP COLUMN IF EXISTS is_from_manager'
            ),
        ),
    ]
