from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings


def user_avatar_path(instance, filename):
    """Генерирует путь для сохранения аватарки"""
    return f"avatars/{instance.username}/{filename}"

class CustomUser(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    address = models.TextField(
            verbose_name="Адрес",
            blank=True,
            null=True,
            default="Адрес не указан"
        )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=20, default="")
    agree_to_terms = models.BooleanField(default=False)
    
    groups = models.ManyToManyField(
        Group,
        related_name="customuser_set",
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="customuser_permissions_set",
        blank=True,
    )
