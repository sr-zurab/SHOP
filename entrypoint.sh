#!/bin/sh
set -e

# Чиним права на media/staticfiles, раз volume монтируется от root
chown -R app:app /app/media /app/staticfiles

# Дальше выполняем то, что передали как CMD, уже от имени app
exec gosu app "$@"