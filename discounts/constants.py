from django.db import models


class DiscountType(models.TextChoices):
    PERCENT = 'percent', 'Процент'
    FIXED = 'fixed', 'Фиксированная сумма'


class DiscountStatus(models.TextChoices):
    DRAFT = 'draft', 'Черновик'
    ACTIVE = 'active', 'Активна'
    PAUSED = 'paused', 'Приостановлена'
    EXPIRED = 'expired', 'Завершена'