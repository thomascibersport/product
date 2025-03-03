from rest_framework import serializers
from .models import Product
from .models import Category
from .models import CartItem
from .models import Order, OrderItem
from django.db import transaction
from django.db.models import F

class ProductSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        write_only=True,
        required=False  # Добавьте если нужно разрешить null
    )
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('farmer', 'slug')  # Добавляем slug в read-only



class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


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
    
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'delivery_type', 'payment_method', 
                 'total_amount', 'address', 'items', 'created_at']
        read_only_fields = ['user']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        with transaction.atomic():
            order = Order.objects.create(**validated_data)
            
            for item_data in items_data:
                product = item_data['product']
                quantity = item_data['quantity']
                
                # Проверка и обновление количества товара
                updated = Product.objects.filter(
                    id=product.id,
                    quantity__gte=quantity
                ).update(
                    quantity=F('quantity') - quantity
                )
                
                if not updated:
                    raise serializers.ValidationError(
                        f"Недостаточно товара '{product.name}' в наличии"
                    )
                
                OrderItem.objects.create(order=order, **item_data)
            
            return order
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'delivery_type', 'payment_method', 
                 'total_amount', 'address', 'items', 'created_at']
        read_only_fields = ['user']