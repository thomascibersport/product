from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings


def user_avatar_path(instance, filename):
    """Генерирует путь для сохранения аватарки"""
    return f"avatars/{instance.username}/{filename}"

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True, verbose_name="Электронная почта")
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    address = models.TextField(
            verbose_name="Адрес",
            blank=True,
            null=True,
            default="Адрес не указан"
        )
    
    average_rating = models.FloatField(default=0.0, verbose_name="Средний рейтинг")
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Телефон")
    show_phone = models.BooleanField(default=True, verbose_name="Показывать телефон другим пользователям")
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
    def __str__(self):
            return self.username
