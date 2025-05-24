from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings


def user_avatar_path(instance, filename):
    """Генерирует путь для сохранения аватарки"""
    return f"avatars/{instance.username}/{filename}"

def user_media_path(instance, filename):
    """Генерирует путь для сохранения медиафайлов пользователя"""
    return f"user_media/{instance.user.username}/{filename}"

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
    bio = models.TextField(blank=True, null=True, verbose_name="О себе или хозяйстве")
    agree_to_terms = models.BooleanField(default=False)
    
    # Seller application fields
    is_seller = models.BooleanField(default=False, verbose_name="Является продавцом")
    seller_status = models.CharField(
        max_length=20,
        choices=[
            ('not_applied', 'Не подавал заявку'),
            ('pending', 'На рассмотрении'),
            ('approved', 'Подтверждён'),
            ('rejected', 'Отклонён')
        ],
        default='not_applied',
        verbose_name="Статус продавца"
    )
    seller_description = models.TextField(blank=True, null=True, verbose_name="Описание деятельности продавца")
    seller_application_date = models.DateTimeField(null=True, blank=True, verbose_name="Дата подачи заявки")
    seller_application_notes = models.TextField(blank=True, null=True, verbose_name="Примечания к заявке")
    seller_reject_reason = models.TextField(blank=True, null=True, verbose_name="Причина отклонения")
    
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

class SellerApplicationImage(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='seller_images')
    image = models.ImageField(upload_to='seller_applications/', verbose_name="Изображение")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Изображение для заявки {self.user.username}"

class UserMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('image', 'Изображение'),
        ('video', 'Видео'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='media')
    file = models.FileField(upload_to=user_media_path, verbose_name="Медиафайл")
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='image', verbose_name="Тип медиа")
    title = models.CharField(max_length=255, blank=True, null=True, verbose_name="Заголовок")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")
    
    class Meta:
        verbose_name = "Медиафайл пользователя"
        verbose_name_plural = "Медиафайлы пользователей"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.get_media_type_display()} пользователя {self.user.username}"
