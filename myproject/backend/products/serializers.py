from rest_framework import serializers
from .models import Product
from .models import Category
from .models import CartItem
class ProductSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField()  # теперь выводит __str__ модели Category

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('farmer',)
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