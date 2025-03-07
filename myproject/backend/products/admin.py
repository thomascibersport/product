from django.contrib import admin
from .models import Product, Category, CartItem, Order, OrderItem

class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'farmer', 'price', 'created_at')
    list_filter = ('category', 'farmer')
    search_fields = ('name', 'description')
    list_editable = ('price',)
    prepopulated_fields = {'slug': ('name',)}

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

class CartItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'quantity', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('product__name', 'user__username')

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('product', 'quantity', 'price')
    readonly_fields = ('product', 'quantity', 'price')


class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'created_at', 'delivery_type', 
                   'payment_method', 'total_amount', 'address')
    list_filter = ('status', 'delivery_type', 'payment_method', 'created_at')
    list_editable = ('status',)  
    search_fields = ('user__email', 'address', 'id')
    readonly_fields = ('created_at', 'total_amount')
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'status', 'created_at', 'total_amount')
        }),
        ('Детали заказа', {
            'fields': ('delivery_type', 'payment_method', 'address')
        }),
    )

admin.site.register(Product, ProductAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(CartItem, CartItemAdmin)
admin.site.register(Order, OrderAdmin)