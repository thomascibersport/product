from rest_framework import serializers
from .models import Product, Category, CartItem, Order, OrderItem
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import F

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'price']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    is_owner = serializers.SerializerMethodField()
    editable = serializers.SerializerMethodField()
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        write_only=True,
        required=True  # Исправлено
    )
    farmer_name = serializers.SerializerMethodField()

    class Meta:  # Добавлен правильный отступ
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'quantity', 
            'unit', 'category', 'category_id', 'image', 
            'farmer_name', 'created_at', 'is_owner', 'editable'
        ]
        read_only_fields = ('farmer', 'slug', 'editable')

    # Методы с правильными отступами
    def get_farmer_name(self, obj):
        return f"{obj.farmer.first_name} {obj.farmer.last_name}"

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

class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    
    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price']
        extra_kwargs = {
            'price': {'required': False}
        }
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['product'] = ProductShortSerializer(instance.product).data
        return representation

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    farmer = serializers.PrimaryKeyRelatedField(read_only=True)
    farmer_name = serializers.CharField(source='farmer.username', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'farmer', 'farmer_name', 'delivery_type',
            'payment_method', 'address', 'total_amount', 'created_at', 'items'
        ]
        read_only_fields = ['user', 'created_at', 'total_amount']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Заказ должен содержать хотя бы один товар")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        
        total = 0
        products_to_update = []
        
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            
            if product.quantity < quantity:
                raise ValidationError(
                    f"Недостаточно товара '{product.name}'. Доступно: {product.quantity}"
                )
            
            total += product.price * quantity
            products_to_update.append((product, quantity))
        
        validated_data.pop('user', None)
        
        with transaction.atomic():
            order = Order.objects.create(
                user=user,
                total_amount=total,
                **validated_data
            )
            
            order_items = []
            for product, quantity in products_to_update:
                order_items.append(OrderItem(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price=product.price
                ))
                
                product.quantity -= quantity
                product.save()
            
            OrderItem.objects.bulk_create(order_items)
        
        return order