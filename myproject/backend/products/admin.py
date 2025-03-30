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


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'created_at', 'status', 'get_farmers']
    list_filter = ('status', 'delivery_type', 'payment_method')
    search_fields = ('user__email', 'delivery_address', 'pickup_address')
    inlines = [OrderItemInline]
    fieldsets = (
        (None, {
            'fields': (
                'user', 
                'status', 
                'total_amount',
                ('delivery_type', 'payment_method'),  # Добавлена запятая здесь
            )
        }),
        ('Адреса', {
            'fields': (
                'delivery_address', 
                'pickup_address'
            ),
            'classes': ('collapse',)
        }),
    )
    def get_farmers(self, obj):
        farmers = set(item.product.farmer for item in obj.items.all() if item.product)
        return ", ".join([f"{f.first_name} {f.last_name}" for f in farmers])
    get_farmers.short_description = 'Продавцы'
    def get_address(self, obj):
        return obj.delivery_address if obj.delivery_type == 'delivery' else obj.pickup_address

    get_address.short_description = 'Адрес'
admin.site.register(Product, ProductAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(CartItem, CartItemAdmin)