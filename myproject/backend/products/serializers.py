from rest_framework import serializers
from .models import Product, Category, CartItem, Order, OrderItem
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import F
from django.contrib.auth import get_user_model
User = get_user_model()

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductShortSerializer(serializers.ModelSerializer):
    delivery_available = serializers.BooleanField()
    seller_address = serializers.CharField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'delivery_available', 'seller_address']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    is_owner = serializers.SerializerMethodField()
    editable = serializers.SerializerMethodField()
    delivery_available = serializers.BooleanField()
    farmer_name = serializers.SerializerMethodField()
    seller_address = serializers.CharField(required=False, allow_blank=True)
    # Добавляем поле farmer (id фермера)
    farmer = serializers.PrimaryKeyRelatedField(
        read_only=True  # Делаем его доступным только для чтения
    )

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        write_only=True,
        required=True  
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'quantity', 
            'unit', 'category', 'category_id', 'image', 
            'farmer', 'farmer_name', 'created_at', 
            'is_owner', 'editable', 'delivery_available','seller_address'
        ]
        read_only_fields = ('farmer', 'slug', 'editable')

    def get_farmer_name(self, obj):
        """Возвращает полное имя фермера"""
        if obj.farmer:
            return f"{obj.farmer.first_name} {obj.farmer.last_name}"
        return "Неизвестный производитель"


    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.farmer
    
    def get_editable(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.farmer


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'created_at']
        extra_kwargs = {
            'product': {'required': True},
            'quantity': {'required': True}
        }

class CartItemDetailSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'created_at', 'total_price']

    def get_total_price(self, obj):
        return obj.product.price * obj.quantity

# serializers.py

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductShortSerializer(read_only=True)
    price = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    delivery_available = serializers.BooleanField(
        source='product.delivery_available', 
        read_only=True
    )
    farmer = serializers.SerializerMethodField()  # Требует метод get_farmer

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price', 'delivery_available', 'farmer']

    # Добавляем отсутствующий метод
    def get_farmer(self, obj):
        """Получаем данные фермера из связанного продукта"""
        if obj.product and obj.product.farmer:
            return {
                'address': obj.product.farmer.address,
                'phone': obj.product.farmer.phone
            }
        return None

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'delivery_type', 'payment_method', 'delivery_address', 
            'pickup_address', 'total_amount', 'created_at', 'items', 'status', 
            'status_display'
        ]
        read_only_fields = ['user', 'total_amount']

    def get_status_display(self, obj):
        return dict(Order.STATUS_CHOICES).get(obj.status, "Неизвестный статус")
    # Добавляем поле для получения данных от клиента
    def to_internal_value(self, data):
        internal_data = super().to_internal_value(data)
        internal_data['items'] = data.get('items', [])
        return internal_data

    def create(self, validated_data):
        validated_data.pop('user', None)
        items_data = validated_data.pop('items', [])
        user = self.context['request'].user

        total = 0
        products_to_update = []

        for item_data in items_data:
            product_id = item_data.get('product')
            quantity = item_data.get('quantity', 1)
            
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise ValidationError(
                    {'product': f'Продукт с ID {product_id} не найден'}
                )

            if product.quantity < quantity:
                raise ValidationError(
                    f"Недостаточно товара '{product.name}'. Доступно: {product.quantity}"
                )

            total += product.price * quantity
            products_to_update.append((product, quantity))

        with transaction.atomic():
            order = Order.objects.create(
                user=user,
                total_amount=total,
                **validated_data
            )

            OrderItem.objects.bulk_create([
                OrderItem(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price=product.price
                ) for product, quantity in products_to_update
            ])

            for product, quantity in products_to_update:
                product.quantity = F('quantity') - quantity
                product.save()

        return order