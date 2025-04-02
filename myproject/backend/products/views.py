from rest_framework import status
from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Product, Category, CartItem, Order  
from .serializers import (
    ProductSerializer, 
    CategorySerializer, 
    CartItemSerializer, 
    CartItemDetailSerializer,
    OrderSerializer,
    UserProfileSerializer
)
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from .serializers import OrderSerializer
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from .serializers import UserProfileSerializer


User = get_user_model()

class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    lookup_field = 'id'
    permission_classes = [AllowAny]

class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
class ProductCreate(generics.CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Добавлена проверка наличия категории в данных
        if 'category' not in serializer.validated_data:
            raise ValidationError({'category': 'This field is required'})
        
        serializer.save(farmer=self.request.user)
class ProductList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Product.objects.all()
        # Если пользователь авторизован - исключаем его товары
        if self.request.user.is_authenticated:
            queryset = queryset.exclude(farmer=self.request.user)
        return queryset


class CategoryList(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductDetail(generics.RetrieveDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    def perform_update(self, serializer):
            if serializer.instance.seller != self.request.user:  # Предполагается поле seller
                raise PermissionDenied("Вы не можете редактировать этот продукт")
            serializer.save()
    def delete(self, request, *args, **kwargs):
        try:
            # Проверка аутентификации
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Требуется авторизация"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            product = self.get_object()
            
            # Проверка прав владельца
            if product.farmer != request.user:
                return Response(
                    {"error": "Вы не можете удалить этот товар"},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            return super().delete(request, *args, **kwargs)
            
        except Exception as e:
            return Response(
                {"error": "Внутренняя ошибка сервера"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CartItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return CartItemDetailSerializer
        return CartItemSerializer

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        product_id = self.request.data.get('product')
        quantity = self.request.data.get('quantity', 1)
        
        # Проверяем существование товара
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValidationError({'product': 'Товар не найден'})
            
        # Обновляем количество если товар уже в корзине
        cart_item, created = CartItem.objects.get_or_create(
            user=self.request.user,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += int(quantity)
            cart_item.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    def clear(self, request):
            cart_items = CartItem.objects.filter(user=request.user)
            cart_items.delete()
            return Response({'status': 'cart cleared'})
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def seller_orders(self, request):
        seller = request.user
        orders = Order.objects.filter(items__product__farmer=seller).distinct()
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        user = request.user
        reason = request.data.get('reason', '')

        # Проверка: если пользователь — покупатель или продавец
        if order.user == user or order.items.filter(product__farmer=user).exists():
            if order.status != 'processing':
                return Response(
                    {'error': 'Невозможно отменить заказ в текущем статусе'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            order.status = 'canceled'
            order.cancel_reason = reason
            order.canceled_by = user  # Устанавливаем, кто отменил заказ
            order.save()
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        else:
            return Response(
                {'error': 'Вы не можете отменить этот заказ'},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def confirm(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        seller = request.user
        if not order.items.filter(product__farmer=seller).exists():
            return Response(
                {'error': 'Вы не можете подтвердить этот заказ'},
                status=status.HTTP_403_FORBIDDEN
            )
        order.status = 'confirmed'
        order.save()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save()
class MyProductsList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(farmer=self.request.user).select_related('category')  

class UserProductsList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Product.objects.filter(farmer_id=user_id)

    # Добавьте контекст запроса для формирования полных URL
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context