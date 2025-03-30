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
    OrderSerializer  
)
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

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

    # Правильный отступ для декоратора @action
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.user != request.user:
            return Response(
                {'error': 'Вы не можете отменить этот заказ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        order.status = 'canceled'
        order.save()
        return Response({'status': 'Заказ отменен'})

    # Метод должен быть на том же уровне, что и cancel
    def perform_create(self, serializer):
        serializer.save()
class MyProductsList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(farmer=self.request.user).select_related('category')  