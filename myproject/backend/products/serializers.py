from rest_framework import serializers
from .models import Product, Category, CartItem, Order, OrderItem
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import F
from django.contrib.auth import get_user_model
from .models import Message
from .models import Review
User = get_user_model()

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
class FarmerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone'] 
class ProductShortSerializer(serializers.ModelSerializer):
    delivery_available = serializers.BooleanField()
    seller_address = serializers.CharField()
    farmer = FarmerSerializer(read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'delivery_available', 'seller_address', 'farmer']

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
    product = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    delivery_available = serializers.BooleanField(source='product.delivery_available', read_only=True)
    farmer = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price', 'delivery_available', 'farmer']

    def get_product(self, obj):
        if obj.product:
            return ProductShortSerializer(obj.product).data
        return None  # Если товар отсутствует, возвращаем null

    def get_farmer(self, obj):
        if obj.product and obj.product.farmer:
            return {
                'id': obj.product.farmer.id,
                'address': obj.product.farmer.address or "Не указан",
                'phone': obj.product.farmer.phone or "Не указан"
            }
        return None
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "avatar", "first_name", "last_name", "middle_name", "phone", "show_phone"]
        extra_kwargs = {
            'show_phone': {'required': False}
        }

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    canceled_by = UserSerializer(read_only=True)
    canceled_by_role = serializers.SerializerMethodField()
    cancel_reason = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'delivery_type', 'payment_method', 'delivery_address', 
            'pickup_address', 'total_amount', 'created_at', 'items', 'status', 
            'status_display', 'canceled_by', 'canceled_by_role', 'cancel_reason'  # Removed 'total'
        ]
        read_only_fields = ['user', 'total_amount', 'canceled_by']

    def get_status_display(self, obj):
        return dict(Order.STATUS_CHOICES).get(obj.status, "Неизвестный статус")

    def get_canceled_by_role(self, obj):
        if obj.canceled_by:
            if obj.canceled_by == obj.user:
                return 'buyer'
            else:
                return 'seller'
        return None

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

class UserProfileSerializer(serializers.ModelSerializer):
    average_rating = serializers.FloatField(read_only=True)  # Добавлено поле среднего рейтинга

    class Meta:
        model = User  
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar', 'show_phone', 'average_rating']
        extra_kwargs = {
            'show_phone': {'required': False, 'allow_null': True}
        }
class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    recipient = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        error_messages={
            'does_not_exist': 'Пользователь-получатель не найден.'
        }
    )

    class Meta:
        model = Message
        fields = ["id", "sender", "recipient", "content", "timestamp"]
        read_only_fields = ["sender", "timestamp"]
class ReviewSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    author_name = serializers.SerializerMethodField()
    recipient = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "author", "author_name", "recipient", "content", "rating", "created_at"]
        read_only_fields = ["author", "created_at", "recipient"]

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}"