from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    # добавляйте свои поля здесь по мере необходимости

    def __str__(self):
        return self.username or self.email