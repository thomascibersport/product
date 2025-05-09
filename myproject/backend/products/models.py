from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.text import slugify
from django.core.exceptions import ValidationError  
import uuid

class Product(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=200, unique=True, editable=False)  
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=20, default="шт")
    category = models.ForeignKey("Category", on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    delivery_available = models.BooleanField(default=False, verbose_name="Доступна доставка")
    seller_address = models.TextField(blank=True, null=True, verbose_name="Адрес продавца")
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Обновляем slug при изменении названия
        if not self.slug or self._state.adding:
            base_slug = slugify(self.name)
            unique_id = uuid.uuid4().hex[:6]
            self.slug = f"{base_slug}-{unique_id}"
        super().save(*args, **kwargs)

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=200, unique=True, editable=False)  # Убраны null/blank, добавлено editable=False
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            unique_id = uuid.uuid4().hex[:6]  # Добавлена генерация уникального slug
            self.slug = f"{base_slug}-{unique_id}"
        super().save(*args, **kwargs)

class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.quantity < 1:
            raise ValidationError("Количество не может быть меньше 1")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Order(models.Model):
    STATUS_CHOICES = [
        ('processing', 'В обработке'),
        ('confirmed', 'Подтвержден'),
        ('shipped', 'Отправлен'),
        ('in_transit', 'В пути'),
        ('delivered', 'Доставлен'),
        ('canceled', 'Отменен'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='processing'
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    delivery_type = models.CharField(max_length=20, choices=(
        ('delivery', 'Доставка'),
        ('pickup', 'Самовывоз')
    ))
    payment_method = models.CharField(max_length=20, choices=(
        ('card', 'Картой'),
        ('cash', 'Наличные')
    ))
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    delivery_address = models.TextField(blank=True, null=True)
    pickup_address = models.TextField(blank=True, null=True)
    cancel_reason = models.TextField(null=True, blank=True, verbose_name="Причина отмены")
    canceled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='canceled_orders',
        verbose_name="Отменен пользователем"
    )

    def __str__(self):
        return f"Order #{self.id} - {self.user.email}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(
        Product, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    # Удалено ошибочное поле slug
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        if self.product:
            return f"{self.product.name} x{self.quantity}"
        return f"Удаленный продукт x{self.quantity}"

class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="sent_messages", on_delete=models.CASCADE)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="received_messages", on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender} to {self.recipient}"

class Review(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='authored_reviews', on_delete=models.CASCADE)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_reviews', on_delete=models.CASCADE)
    content = models.TextField()
    rating = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('author', 'recipient')

    def __str__(self):
        return f"Review by {self.author} for {self.recipient}"

def add_categories():
    from products.models import Category
    categories = [
        "Овощи", "Фрукты", "Молочные продукты", "Мясо", "Рыба", 
        "Напитки", "Зерновые", "Сладости", "Орехи", "Выпечка", 
        "Консервы", "Замороженные продукты", "Специи", "Масла", "Ягоды"
    ]
    for category_name in categories:
        Category.objects.get_or_create(name=category_name)
