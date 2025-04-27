from rest_framework import status
from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Product, Category, CartItem, Order, OrderItem, Review
from .serializers import (
    ProductSerializer, 
    CategorySerializer, 
    CartItemSerializer, 
    CartItemDetailSerializer,
    OrderSerializer,
    UserProfileSerializer,
    UserSerializer,
    ReviewSerializer
)
from django.db.models import Avg, Count, Sum, F, IntegerField, FloatField
from django.db.models.functions import ExtractHour, TruncMonth
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Order, OrderItem, Review
from django.utils import timezone
from django.db.models import Q


from django.utils import timezone
from django.db.models import Count, Avg, F, IntegerField, ExpressionWrapper
from django.db.models.functions import ExtractIsoWeekDay
from rest_framework.views import APIView
from rest_framework import serializers

from .models import Order
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from .models import Message
from .serializers import MessageSerializer

from rest_framework.views import APIView
from rest_framework.serializers import SerializerMethodField
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import models
from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAuthenticatedOrReadOnly


from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Sum, Count, Avg, Q
from django.db.models.functions import TruncMonth

from django.db.models import Case, When, Value, IntegerField, DecimalField, FloatField
from django.db.models.expressions import ExpressionWrapper

from django.db.models import Subquery, OuterRef, IntegerField, Count, Sum
User = get_user_model()

class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.annotate(average_rating=Avg('received_reviews__rating'))
    serializer_class = UserProfileSerializer
    lookup_field = 'id'
    permission_classes = [AllowAny]


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

class ProductDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def perform_update(self, serializer):
        if serializer.instance.farmer != self.request.user:
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
        if self.action == 'seller_orders':
            return Order.objects.filter(items__product__farmer=self.request.user).distinct()
        return Order.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def seller_orders(self, request):
        try:
            seller = request.user
            orders = Order.objects.filter(
                items__product__farmer=seller
            ).distinct().prefetch_related('items__product')
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    # Добавляем проверку верификации пользователя
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    serializer = MessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(sender=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_messages(request):
    user = request.user
    # Проверяем, есть ли сообщения, где пользователь — отправитель или получатель
    has_messages = Message.objects.filter(Q(sender=user) | Q(recipient=user)).exists()
    return Response({'has_messages': has_messages})
class ChatListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        sent_messages = Message.objects.filter(sender=user).values('recipient').distinct()
        received_messages = Message.objects.filter(recipient=user).values('sender').distinct()

        chat_partners = set()
        for msg in sent_messages:
            chat_partners.add(msg['recipient'])
        for msg in received_messages:
            chat_partners.add(msg['sender'])

        partners = User.objects.filter(id__in=chat_partners)
        serializer = UserSerializer(partners, many=True, context={'request': request})
        return Response(serializer.data)
class ChatMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        partner = get_object_or_404(User, pk=pk)
        messages = Message.objects.filter(
            (Q(sender=user) & Q(recipient=partner)) |
            (Q(sender=partner) & Q(recipient=user)),
            is_deleted=False  # Фильтруем удаленные сообщения
        ).order_by('timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
class UploadFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'Файл не найден'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        file_name = default_storage.save(file.name, ContentFile(file.read()))
        file_url = default_storage.url(file_name)

        return Response({'url': file_url}, status=status.HTTP_201_CREATED)
class MessageDetailView(APIView):
    def patch(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        if message.sender != request.user:
            return Response({"error": "Вы не можете редактировать это сообщение"}, 
                            status=status.HTTP_403_FORBIDDEN)
        serializer = MessageSerializer(message, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        if message.sender != request.user:
            return Response({"error": "Вы не можете удалить это сообщение"}, 
                            status=status.HTTP_403_FORBIDDEN)
        message.is_deleted = True
        message.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MessageDeleteView(APIView):
    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        if message.sender != request.user:
            return Response({"error": "Вы не можете удалить это сообщение"}, 
                            status=status.HTTP_403_FORBIDDEN)
        message.is_deleted = True
        message.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
class MessageListView(APIView):
    def get(self, request):
        messages = Message.objects.filter(is_deleted=False)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        recipient_id = self.kwargs['recipient_id']
        return Review.objects.filter(recipient_id=recipient_id)

    def perform_create(self, serializer):
        recipient_id = self.kwargs['recipient_id']
        recipient = get_object_or_404(User, id=recipient_id)
        if Review.objects.filter(author=self.request.user, recipient=recipient).exists():
            raise ValidationError("Вы уже оставили отзыв этому пользователю.")
        serializer.save(author=self.request.user, recipient=recipient)
class IsAuthenticatedOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        # Разрешаем GET-запросы всем, а остальные — только авторизованным
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated
class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        # Проверяем, что только автор отзыва может его удалить
        if instance.author != self.request.user:
            raise PermissionDenied("Вы не можете удалить этот отзыв.")
        instance.delete()
class SellerStatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seller = request.user
        current_year = timezone.now().year
        
        # Основные метрики
        orders_data = self.get_orders_data(seller)
        products_data = self.get_products_data(seller)
        customers_data = self.get_customers_data(seller)
        monthly_stats = self.get_monthly_stats(seller, current_year)
        rating_stats = self.get_rating_stats(seller)
        
        # Новые метрики
        avg_customer_rating = self.get_avg_customer_rating(seller)
        peak_hours = self.get_peak_hours(seller)
        purchases = self.get_purchases(seller)
        seasonal_products = self.get_seasonal_products(seller)

        return Response({
            'orders': orders_data,
            'products': products_data,
            'customers': customers_data,
            'monthly_stats': monthly_stats,
            'rating_stats': rating_stats,
            'avg_customer_rating': avg_customer_rating,
            'peak_hours': peak_hours,
            'purchases': purchases,
            'seasonal_products': seasonal_products
        })

    def get_orders_data(self, seller):
        orders = OrderItem.objects.filter(
            product__farmer=seller,
            order__status__in=['confirmed', 'shipped', 'delivered']
        )
        
        aggregation = orders.aggregate(
            total_orders=Count('id'),
            total_quantity=Sum('quantity'),
            total_revenue=Sum(
                ExpressionWrapper(
                    F('price') * F('quantity'),
                    output_field=FloatField()
                )
            )
        )
        
        return {
            'total_orders': aggregation['total_orders'],
            'total_quantity': aggregation['total_quantity'] or 0,
            'total_revenue': aggregation['total_revenue'] or 0
        }

    def get_products_data(self, seller):
        return OrderItem.objects.filter(
            product__farmer=seller
        ).values(
            'product__name'
        ).annotate(
            total_sold=Sum('quantity'),
            total_revenue=Sum(
                ExpressionWrapper(
                    F('price') * F('quantity'),
                    output_field=FloatField()
                )
            )
        ).order_by('-total_sold')[:10]

    def get_customers_data(self, seller):
        customers = OrderItem.objects.filter(
            product__farmer=seller
        ).values(
            'order__user__id',
            'order__user__first_name',
            'order__user__last_name'
        ).annotate(
            order_count=Count('order', distinct=True),
            total_spent=Sum(F('price') * F('quantity'))
        )
        
        for customer in customers:
            user_id = customer['order__user__id']
            customer['avg_rating'] = Review.objects.filter(
                recipient_id=user_id
            ).aggregate(Avg('rating'))['rating__avg'] or 0
            
        return sorted(customers, key=lambda x: x['total_spent'], reverse=True)[:10]

    def get_monthly_stats(self, seller, year):
        return OrderItem.objects.filter(
            product__farmer=seller,
            order__created_at__year=year
        ).annotate(
            month=TruncMonth('order__created_at')
        ).values('month').annotate(
            orders=Count('id'),
            revenue=Sum(F('price') * F('quantity')),
            items_sold=Sum('quantity')
        ).order_by('month')

    def get_rating_stats(self, seller):
        order_count_subquery = Order.objects.filter(
            user=OuterRef('recipient'),
            items__product__farmer=seller
        ).values('user').annotate(count=Count('id')).values('count')

        rating_stats = Review.objects.filter(
            recipient__in=User.objects.filter(
                id__in=OrderItem.objects.filter(
                    product__farmer=seller
                ).values_list('order__user', flat=True).distinct()
            )
        ).annotate(
            order_count=Subquery(order_count_subquery, output_field=IntegerField())
        ).values('rating').annotate(
            count=Count('id'),
            total_orders=Sum('order_count')
        ).order_by('-rating')

        return rating_stats

    def get_avg_customer_rating(self, seller):
        customer_ids = OrderItem.objects.filter(
            product__farmer=seller
        ).values_list('order__user__id', flat=True).distinct()
        
        avg_rating = Review.objects.filter(
            recipient_id__in=customer_ids
        ).aggregate(Avg('rating'))['rating__avg'] or 0
        
        return avg_rating

    def get_peak_hours(self, seller):
        peak_hours = Order.objects.filter(
            items__product__farmer=seller
        ).annotate(
            hour=ExtractHour('created_at')
        ).values('hour').annotate(
            order_count=Count('id')
        ).order_by('hour')
        
        return list(peak_hours)

    def get_purchases(self, seller):
        return OrderItem.objects.filter(
            product__farmer=seller
        ).values(
            'order__user__id',
            'order__user__first_name',
            'order__user__last_name',
            'product__name',
            'quantity',
            'price'
        ).order_by('-order__user__id')

    def get_seasonal_products(self, seller):
        current_month = timezone.now().month
        season_start = (current_month - 2) % 12 or 12  # Пример: последние 3 месяца
        season_end = current_month
        
        return OrderItem.objects.filter(
            product__farmer=seller,
            order__created_at__month__gte=season_start,
            order__created_at__month__lte=season_end
        ).values(
            'product__name'
        ).annotate(
            total_sold=Sum('quantity')
        ).order_by('-total_sold')[:5]