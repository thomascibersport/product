from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator 
from django.utils.text import slugify  # <- Добавить здесь
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=200, unique=True, null=True, blank=True)  # Temporarily allow NULL
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator 
from django.utils.text import slugify

class Product(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=200, unique=True, null=True, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0)  
    unit = models.CharField(max_length=20, default="шт")  
    category = models.ForeignKey("Category", on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
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