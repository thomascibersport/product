from django.contrib import admin
from .models import Product, Category, CartItem, Order, OrderItem, Message, Review

# Класс для Product
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'farmer', 'price', 'quantity', 'unit', 'created_at', 'delivery_available', 'seller_address')
    list_filter = ('category', 'farmer', 'delivery_available')
    search_fields = ('name', 'description', 'seller_address')
    list_editable = ('price', 'quantity')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('slug', 'created_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description', 'price', 'quantity', 'unit', 'category', 'image', 'farmer', 'delivery_available', 'seller_address')
        }),
        ('Дополнительно', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

# Класс для Category
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at',)

# Класс для CartItem
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'quantity', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('product__name', 'user__username')

# Инлайн для OrderItem
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('product', 'quantity', 'price')
    readonly_fields = ('product', 'quantity', 'price')

# Класс для Order
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'created_at', 'status', 'delivery_type', 'payment_method', 'total_amount', 'get_farmers', 'canceled_by', 'cancel_reason']
    list_filter = ('status', 'delivery_type', 'payment_method', 'canceled_by')
    search_fields = ('user__email', 'delivery_address', 'pickup_address', 'cancel_reason')
    inlines = [OrderItemInline]
    fieldsets = (
        (None, {
            'fields': (
                'user', 
                'status', 
                'total_amount',
                ('delivery_type', 'payment_method'),
                'canceled_by',
                'cancel_reason',
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

# Класс для Message
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'timestamp', 'content_preview', 'is_deleted')
    list_filter = ('sender', 'recipient', 'timestamp', 'is_deleted')
    search_fields = ('sender__username', 'recipient__username', 'content')
    readonly_fields = ('timestamp',)
    fieldsets = (
        (None, {
            'fields': ('sender', 'recipient', 'content', 'is_deleted')
        }),
        ('Дополнительно', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Предпросмотр сообщения'

# Класс для Review
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('author', 'recipient', 'rating', 'created_at', 'content_preview')
    list_filter = ('rating', 'created_at')
    search_fields = ('author__username', 'recipient__username', 'content')
    readonly_fields = ('created_at',)
    fieldsets = (
        (None, {
            'fields': ('author', 'recipient', 'content', 'rating')
        }),
        ('Дополнительно', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Предпросмотр отзыва'

# Регистрация всех моделей
admin.site.register(Product, ProductAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(CartItem, CartItemAdmin)
admin.site.register(Message, MessageAdmin)
admin.site.register(Review, ReviewAdmin)