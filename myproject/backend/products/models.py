from django.db import models
from django.conf import settings

class Product(models.Model):
    name = models.CharField(max_length=100)  # Название продукта
    description = models.TextField()         # Описание
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Цена
    category = models.CharField(max_length=50)  # Категория
    image = models.ImageField(upload_to='products/', blank=True, null=True)  # Изображение (опционально)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # Фермер, добавивший продукт

    def __str__(self):
        return self.name