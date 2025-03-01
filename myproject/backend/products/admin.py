from django.contrib import admin
from .models import Product, Category, CartItem

class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'farmer', 'price', 'created_at')
    list_filter = ('category', 'farmer')
    search_fields = ('name', 'description')
    list_editable = ('price',)
    prepopulated_fields = {'slug': ('name',)}  # Если у вас есть поле slug

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}  # Если у вас есть поле slug

class CartItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'quantity', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('product__name', 'user__username')

admin.site.register(Product, ProductAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(CartItem, CartItemAdmin)