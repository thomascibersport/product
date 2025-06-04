from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import models
from django.db.models import (
    Avg,
    Case,
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    FloatField,
    Q,
    Subquery,
    Sum,
    Value,
    When,
    IntegerField,
    OuterRef,
    DateTimeField,
    CharField,
)
from django.conf import settings
from django.db.models.functions import ExtractHour, TruncMonth, ExtractIsoWeekDay, TruncDate, ExtractMonth, ExtractWeekDay, Lower
from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.views.generic import TemplateView
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.mixins import LoginRequiredMixin

from rest_framework import status, generics, viewsets, serializers
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import (
    IsAuthenticated,
    AllowAny,
    BasePermission,
    SAFE_METHODS,
    IsAuthenticatedOrReadOnly,
    IsAdminUser,
)
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.serializers import SerializerMethodField

from authentication.models import CustomUser
from .models import Product, Category, CartItem, Order, OrderItem, Message, Review
from .serializers import (
    ProductSerializer,
    CategorySerializer,
    CartItemSerializer,
    CartItemDetailSerializer,
    OrderSerializer,
    MessageSerializer,
    ReviewSerializer,
    UserProfileSerializer,
    UserSerializer,
)
from yandexcloud import SDK
import requests
import os
from datetime import datetime, timedelta, time
from decimal import Decimal
import json
import difflib
import random
User = get_user_model()


class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            self.get_object(), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserProfileSerializer
    lookup_field = "id"
    permission_classes = [AllowAny]


class ProductCreate(generics.CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Добавлена проверка наличия категории в данных
        if "category" not in serializer.validated_data:
            raise ValidationError({"category": "This field is required"})

        serializer.save(farmer=self.request.user)


class ProductList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Product.objects.filter(quantity__gt=0)  # Only show products with quantity > 0
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
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            product = self.get_object()

            # Проверка прав владельца
            if product.farmer != request.user:
                return Response(
                    {"error": "Вы не можете удалить этот товар"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            return super().delete(request, *args, **kwargs)

        except Exception as e:
            return Response(
                {"error": "Внутренняя ошибка сервера"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CartItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return CartItemDetailSerializer
        return CartItemSerializer

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related("product")

    def perform_create(self, serializer):
        product_id = self.request.data.get("product")
        quantity = int(self.request.data.get("quantity", 1))

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValidationError({"product": "Товар не найден"})

        current_cart_items = CartItem.objects.filter(user=self.request.user)

        if current_cart_items.exists():
            first_item_farmer = current_cart_items.first().product.farmer
            if product.farmer != first_item_farmer:
                raise ValidationError(
                    "Нельзя добавлять товары от разных продавцов в одну корзину."
                )

        cart_item, created = CartItem.objects.get_or_create(
            user=self.request.user, product=product, defaults={"quantity": quantity}
        )

        if not created:
            cart_item.quantity += quantity
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
            return Response({"error": str(e)}, status=400)

    def clear(self, request):
        cart_items = CartItem.objects.filter(user=request.user)
        cart_items.delete()
        return Response({"status": "cart cleared"})


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.action == "seller_orders":
            return Order.objects.filter(
                items__product__farmer=self.request.user
            ).distinct()
        return Order.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def seller_orders(self, request):
        try:
            seller = request.user
            orders = (
                Order.objects.filter(items__product__farmer=seller)
                .distinct()
                .prefetch_related("items__product")
            )
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        user = request.user
        reason = request.data.get("reason", "")

        # Проверка: если пользователь — покупатель или продавец
        if order.user == user or order.items.filter(product__farmer=user).exists():
            if order.status != "processing":
                return Response(
                    {"error": "Невозможно отменить заказ в текущем статусе"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            order.status = "canceled"
            order.cancel_reason = reason
            order.canceled_by = user  # Устанавливаем, кто отменил заказ
            order.save()
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        else:
            return Response(
                {"error": "Вы не можете отменить этот заказ"},
                status=status.HTTP_403_FORBIDDEN,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def confirm(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        seller = request.user
        if not order.items.filter(product__farmer=seller).exists():
            return Response(
                {"error": "Вы не можете подтвердить этот заказ"},
                status=status.HTTP_403_FORBIDDEN,
            )
        order.status = "confirmed"
        order.save()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        seller = request.user
        new_status = request.data.get("status")

        # Проверяем, является ли пользователь продавцом заказа
        if not order.items.filter(product__farmer=seller).exists():
            return Response(
                {"error": "Вы не можете изменить статус этого заказа"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Проверяем валидность нового статуса
        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": "Недопустимый статус заказа"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверяем возможность изменения статуса
        if order.status == "canceled":
            return Response(
                {"error": "Нельзя изменить статус отмененного заказа"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.status == "delivered":
            return Response(
                {"error": "Нельзя изменить статус доставленного заказа"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверяем последовательность статусов
        status_sequence = ["processing", "confirmed", "shipped", "in_transit", "delivered"]
        current_index = status_sequence.index(order.status) if order.status in status_sequence else -1
        new_index = status_sequence.index(new_status) if new_status in status_sequence else -1

        if new_index <= current_index:
            return Response(
                {"error": "Невозможно вернуться к предыдущему статусу"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Обновляем статус
        order.status = new_status
        order.save()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save()


class MyProductsList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(farmer=self.request.user).select_related(
            "category"
        )


class UserProductsList(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        return Product.objects.filter(farmer_id=user_id)

    # Добавьте контекст запроса для формирования полных URL
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    # Добавляем проверку верификации пользователя
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = MessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(sender=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_message_data(request):
    """
    Get user data along with message status and unread message count in a single request
    """
    user = request.user
    
    # Use Django's cache framework if available
    # or implement a simple in-memory cache with timeout
    cache_key = f"user_message_data_{user.id}"
    cache_timeout = 5  # 5 seconds cache
    
    # Check if we have this data in request session cache
    # This helps prevent excessive database queries
    if hasattr(request, '_cached_data') and cache_key in request._cached_data:
        cached_item = request._cached_data[cache_key]
        # Check if cache is still valid
        if cached_item['expires'] > timezone.now():
            return Response(cached_item['data'])
    
    # Data not in cache, fetch from database
    # Check if user has any messages
    has_messages = Message.objects.filter(Q(sender=user) | Q(recipient=user)).exists()
    
    # Get unread message count
    unread_count = Message.objects.filter(recipient=user, is_read=False).count()
    
    # Prepare response data
    response_data = {
        "user": UserSerializer(user, context={"request": request}).data,
        "has_messages": has_messages,
        "unread_count": unread_count
    }
    
    # Store in request cache
    if not hasattr(request, '_cached_data'):
        request._cached_data = {}
    
    request._cached_data[cache_key] = {
        'data': response_data,
        'expires': timezone.now() + timedelta(seconds=cache_timeout)
    }
    
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_messages_count(request):
    user = request.user
    count = Message.objects.filter(recipient=user, is_read=False).count()
    return Response({"unread_count": count})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def has_messages(request):
    user = request.user
    # Проверяем, есть ли сообщения, где пользователь — отправитель или получатель
    has_messages = Message.objects.filter(Q(sender=user) | Q(recipient=user)).exists()
    return Response({"has_messages": has_messages})


class ChatListWithDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Get all users with whom the current user has exchanged messages
        sent_messages = Message.objects.filter(sender=user).values('recipient').distinct()
        received_messages = Message.objects.filter(recipient=user).values('sender').distinct()

        chat_partners_ids = set()
        for msg in sent_messages:
            chat_partners_ids.add(msg['recipient'])
        for msg in received_messages:
            chat_partners_ids.add(msg['sender'])

        # Get the partner users
        partners = User.objects.filter(id__in=chat_partners_ids)
        
        result = []
        for partner in partners:
            # Get the last message
            last_message = Message.objects.filter(
                (Q(sender=user) & Q(recipient=partner)) | 
                (Q(sender=partner) & Q(recipient=user)),
                is_deleted=False
            ).order_by('-timestamp').first()
            
            # Count unread messages
            unread_count = Message.objects.filter(
                sender=partner,
                recipient=user,
                is_read=False,
                is_deleted=False
            ).count()
            
            # Prepare the partner data
            partner_data = UserSerializer(partner, context={"request": request}).data
            
            # Add last message and unread count
            partner_data['last_message'] = MessageSerializer(last_message).data if last_message else None
            partner_data['unread_count'] = unread_count
            
            result.append(partner_data)
        
        # Sort by last message timestamp (newest first)
        result.sort(
            key=lambda x: x['last_message']['timestamp'] if x['last_message'] else '1970-01-01T00:00:00Z',
            reverse=True
        )
        
        return Response(result)


class ChatListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        sent_messages = (
            Message.objects.filter(sender=user).values("recipient").distinct()
        )
        received_messages = (
            Message.objects.filter(recipient=user).values("sender").distinct()
        )

        chat_partners = set()
        for msg in sent_messages:
            chat_partners.add(msg["recipient"])
        for msg in received_messages:
            chat_partners.add(msg["sender"])

        partners = User.objects.filter(id__in=chat_partners)
        serializer = UserSerializer(partners, many=True, context={"request": request})
        return Response(serializer.data)


class ChatMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        partner = get_object_or_404(User, pk=pk)
        messages = Message.objects.filter(
            (Q(sender=user) & Q(recipient=partner))
            | (Q(sender=partner) & Q(recipient=user)),
            is_deleted=False,  # Фильтруем удаленные сообщения
        ).order_by("timestamp")
        
        # Mark all messages from the partner as read
        Message.objects.filter(
            sender=partner,
            recipient=user,
            is_read=False
        ).update(is_read=True)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class ChatMessagesBetweenUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, sender_id, recipient_id):
        messages = Message.objects.filter(
            (Q(sender_id=sender_id) & Q(recipient_id=recipient_id))
            | (Q(sender_id=recipient_id) & Q(recipient_id=sender_id)),
            is_deleted=False
        ).order_by("timestamp")
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class UploadFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if "file" not in request.FILES:
            return Response(
                {"error": "Файл не найден"}, status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES["file"]
        
        # Создаем путь для сохранения файла с именем пользователя
        user_folder = f"chat_media/{request.user.username}"
        
        # Сохраняем файл в созданную папку
        file_name = default_storage.save(f"{user_folder}/{file.name}", ContentFile(file.read()))
        file_url = default_storage.url(file_name)

        return Response({"url": file_url}, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    def patch(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        if message.sender != request.user:
            return Response(
                {"error": "Вы не можете редактировать это сообщение"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = MessageSerializer(message, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        if message.sender != request.user:
            return Response(
                {"error": "Вы не можете удалить это сообщение"},
                status=status.HTTP_403_FORBIDDEN,
            )
        message.is_deleted = True
        message.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageDeleteView(APIView):
    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        if message.sender != request.user:
            return Response(
                {"error": "Вы не можете удалить это сообщение"},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        recipient_id = self.kwargs["recipient_id"]
        return Review.objects.filter(recipient_id=recipient_id)

    def perform_create(self, serializer):
        recipient_id = self.kwargs["recipient_id"]
        recipient = get_object_or_404(User, id=recipient_id)
        if Review.objects.filter(
            author=self.request.user, recipient=recipient
        ).exists():
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
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        try:
            start_date = (
                datetime.strptime(start_date_str, "%Y-%m-%d").date()
                if start_date_str
                else None
            )
            end_date = (
                datetime.strptime(end_date_str, "%Y-%m-%d").date()
                if end_date_str
                else None
            )
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

        orders_data = self.get_orders_data(seller, start_date, end_date)
        products_data = self.get_products_data(seller, start_date, end_date)
        customers_data = self.get_customers_data(seller, start_date, end_date)
        monthly_stats = self.get_monthly_stats(seller, start_date, end_date)
        rating_stats = self.get_rating_stats(seller, start_date, end_date)
        avg_customer_rating = self.get_avg_customer_rating(seller)
        peak_hours = self.get_peak_hours(seller, start_date, end_date)
        purchases = self.get_purchases(seller, start_date, end_date)
        seasonal_products = self.get_seasonal_products(seller, start_date, end_date)
        category_sales = self.get_category_sales(seller, start_date, end_date)
        sales_by_day_of_week = self.get_sales_by_day_of_week(
            seller, start_date, end_date
        )
        order_statuses = self.get_order_statuses(seller, start_date, end_date)
        delivery_pickup_stats = self.get_delivery_pickup_stats(
            seller, start_date, end_date
        )
        payment_method_stats = self.get_payment_method_stats(
            seller, start_date, end_date
        )
        cancellation_stats = self.get_cancellation_stats(seller, start_date, end_date)
        review_stats = self.get_review_stats(seller)
        customer_purchases = self.get_customer_purchases(seller, start_date, end_date)

        return Response(
            {
                "orders": orders_data,
                "products": list(products_data),
                "customers": list(customers_data),
                "monthly_stats": list(monthly_stats),
                "rating_stats": list(rating_stats),
                "avg_customer_rating": avg_customer_rating,
                "peak_hours": list(peak_hours),
                "purchases": list(purchases),
                "seasonal_products": list(seasonal_products),
                "category_sales": list(category_sales),
                "sales_by_day_of_week": list(sales_by_day_of_week),
                "order_statuses": list(order_statuses),
                "delivery_pickup_stats": list(delivery_pickup_stats),
                "payment_method_stats": list(payment_method_stats),
                "cancellation_stats": cancellation_stats,
                "review_stats": review_stats,
                "customer_purchases": customer_purchases,
            }
        )

    def get_orders_data(self, seller, start_date=None, end_date=None):
        orders = Order.objects.filter(
            items__product__farmer=seller,
            status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            orders = orders.filter(
                created_at__range=(start_date, end_date + timedelta(days=1))
            )
        total_orders = orders.distinct().count()
        order_items = OrderItem.objects.filter(order__in=orders, product__farmer=seller)
        total_quantity = order_items.aggregate(Sum("quantity"))["quantity__sum"] or 0
        total_revenue = (
            order_items.aggregate(total_revenue=Sum(F("quantity") * F("price")))[
                "total_revenue"
            ]
            or 0
        )
        return {
            "total_orders": total_orders,
            "total_quantity": total_quantity,
            "total_revenue": float(total_revenue) if total_revenue else 0.0,
        }

    def get_products_data(self, seller, start_date=None, end_date=None):
        qs = OrderItem.objects.filter(
            product__farmer=seller,
            order__status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(
                order__created_at__range=(start_date, end_date + timedelta(days=1))
            )
        return (
            qs.values("product__id", "product__name")
            .annotate(
                total_sold=Sum("quantity"),
                total_revenue=Sum(F("quantity") * F("price")),
            )
            .order_by("-total_sold")[:10]
        )

    def get_customers_data(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(items__product__farmer=seller)
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        customers = qs.values(
            "user__id", "user__first_name", "user__last_name"
        ).annotate(
            order_count=Count("id", distinct=True), total_spent=Sum("total_amount")
        )
        for customer in customers:
            user_id = customer["user__id"]
            customer["avg_rating"] = (
                Review.objects.filter(recipient_id=user_id).aggregate(Avg("rating"))[
                    "rating__avg"
                ]
                or 0
            )
        return sorted(customers, key=lambda x: x["total_spent"], reverse=True)[:10]

    def get_monthly_stats(self, seller, start_date=None, end_date=None):
        qs = OrderItem.objects.filter(
            product__farmer=seller,
            order__status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(
                order__created_at__range=(start_date, end_date + timedelta(days=1))
            )
        monthly_data = (
            qs.annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(
                orders=Count("order", distinct=True),
                revenue=Sum(F("quantity") * F("price")),
                items_sold=Sum("quantity"),
            )
            .order_by("month")
        )
        for data in monthly_data:
            data["month"] = data["month"].strftime("%Y-%m") if data["month"] else None
        return monthly_data

    def get_rating_stats(self, seller, start_date=None, end_date=None):
        order_count_subquery = Order.objects.filter(
            user=OuterRef("recipient"), items__product__farmer=seller
        )
        if start_date and end_date:
            order_count_subquery = order_count_subquery.filter(
                created_at__range=(start_date, end_date + timedelta(days=1))
            )
        order_count_subquery = (
            order_count_subquery.values("user")
            .annotate(count=Count("id"))
            .values("count")
        )
        rating_stats = (
            Review.objects.filter(
                recipient__in=CustomUser.objects.filter(
                    id__in=OrderItem.objects.filter(product__farmer=seller)
                    .values_list("order__user", flat=True)
                    .distinct()
                )
            )
            .annotate(
                order_count=Subquery(order_count_subquery, output_field=IntegerField())
            )
            .values("rating")
            .annotate(count=Count("id"), total_orders=Sum("order_count"))
            .order_by("-rating")
        )
        return rating_stats

    def get_avg_customer_rating(self, seller):
        customer_ids = (
            OrderItem.objects.filter(product__farmer=seller)
            .values_list("order__user__id", flat=True)
            .distinct()
        )
        avg_rating = (
            Review.objects.filter(recipient_id__in=customer_ids).aggregate(
                Avg("rating")
            )["rating__avg"]
            or 0
        )
        return avg_rating

    def get_peak_hours(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(
            items__product__farmer=seller,
            status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        return (
            qs.annotate(hour=ExtractHour("created_at"))
            .values("hour")
            .annotate(order_count=Count("id", distinct=True))
            .order_by("hour")
        )

    def get_purchases(self, seller, start_date=None, end_date=None):
        qs = OrderItem.objects.filter(
            product__farmer=seller,
            order__status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(
                order__created_at__range=(start_date, end_date + timedelta(days=1))
            )
        return qs.values(
            "order__user__id",
            "order__user__first_name",
            "order__user__last_name",
            "product__name",
            "quantity",
            "price",
        ).order_by("-order__created_at")[:10]

    def get_seasonal_products(self, seller, start_date=None, end_date=None):
        qs = OrderItem.objects.filter(
            product__farmer=seller,
            order__status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(
                order__created_at__range=(start_date, end_date + timedelta(days=1))
            )
        return (
            qs.values("product__name")
            .annotate(total_sold=Sum("quantity"))
            .order_by("-total_sold")[:5]
        )

    def get_category_sales(self, seller, start_date=None, end_date=None):
        qs = OrderItem.objects.filter(
            product__farmer=seller,
            order__status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(
                order__created_at__range=(start_date, end_date + timedelta(days=1))
            )
        return (
            qs.values("product__category__name")
            .annotate(
                name=F("product__category__name"),
                total_sold=Sum("quantity"),
                total_revenue=Sum(F("quantity") * F("price")),
            )
            .values("name", "total_sold", "total_revenue")
        )

    def get_sales_by_day_of_week(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(
            items__product__farmer=seller,
            status__in=["confirmed", "shipped", "in_transit", "delivered"],
        )
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        return (
            qs.annotate(day_of_week=ExtractIsoWeekDay("created_at"))
            .values("day_of_week")
            .annotate(
                order_count=Count("id", distinct=True),
                total_revenue=Sum("total_amount"),
            )
            .order_by("day_of_week")
        )

    def get_order_statuses(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(items__product__farmer=seller)
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        return qs.values("status").annotate(count=Count("id", distinct=True))

    def get_delivery_pickup_stats(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(items__product__farmer=seller)
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        return qs.values("delivery_type").annotate(count=Count("id", distinct=True))

    def get_payment_method_stats(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(items__product__farmer=seller)
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        return qs.values("payment_method").annotate(count=Count("id", distinct=True))

    def get_cancellation_stats(self, seller, start_date=None, end_date=None):
        qs = Order.objects.filter(items__product__farmer=seller, status="canceled")
        if start_date and end_date:
            qs = qs.filter(created_at__range=(start_date, end_date + timedelta(days=1)))
        cancellations = qs.aggregate(total_cancellations=Count("id", distinct=True))
        reasons = qs.values("cancel_reason").annotate(count=Count("id", distinct=True))
        return {
            "total_cancellations": cancellations["total_cancellations"],
            "reasons": list(reasons),
        }

    def get_review_stats(self, seller):
        # Current logic - average rating given to the seller
        seller_reviews = Review.objects.filter(recipient=seller)
        seller_rating = {
            "average_rating": seller_reviews.aggregate(Avg("rating"))["rating__avg"] or 0,
            "total_reviews": seller_reviews.count(),
        }
        
        # Get customer IDs who bought from this seller
        customer_ids = Order.objects.filter(
            items__product__farmer=seller,
            status__in=["confirmed", "shipped", "in_transit", "delivered"]
        ).values_list('user_id', flat=True).distinct()
        
        # Get average rating of those customers (ratings they've received)
        customer_reviews = Review.objects.filter(recipient_id__in=customer_ids)
        customer_rating = {
            "average_rating": customer_reviews.aggregate(Avg("rating"))["rating__avg"] or 0,
            "total_reviews": customer_reviews.count(),
        }
        
        return {
            "seller": seller_rating,
            "customers": customer_rating
        }

    def get_customer_purchases(self, seller, start_date=None, end_date=None):
        orders = Order.objects.filter(
            items__product__farmer=seller,
            status__in=["confirmed", "shipped", "in_transit", "delivered", "canceled"],
        )
        if start_date and end_date:
            orders = orders.filter(
                created_at__range=(start_date, end_date + timedelta(days=1))
            )
        orders = (
            orders.select_related("user")
            .prefetch_related("items__product")
            .distinct()
            .order_by("-created_at")
        )
        customer_purchases = []
        for order in orders:
            seller_items = order.items.filter(product__farmer=seller)
            total_seller_amount = sum(
                item.quantity * item.price for item in seller_items
            )
            customer_purchases.append(
                {
                    "id": order.id,
                    "first_name": order.user.first_name,
                    "last_name": order.user.last_name,
                    "email": order.user.email,
                    "total_spent": float(total_seller_amount),
                    "order_date": order.created_at.isoformat(),
                    "payment_method": order.payment_method,
                    "delivery_type": order.delivery_type,
                    "status": order.status,
                    "items": [
                        {
                            "product_name": item.product.name
                            if item.product
                            else "Товар удален",
                            "quantity": item.quantity,
                            "price": float(item.price),
                            "total": float(item.quantity * item.price),
                        }
                        for item in seller_items
                    ],
                }
            )
        return customer_purchases


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        recipient_id = self.kwargs["recipient_id"]
        return Review.objects.filter(recipient_id=recipient_id)

    def perform_create(self, serializer):
        recipient_id = self.kwargs["recipient_id"]
        recipient = get_object_or_404(CustomUser, id=recipient_id)
        if Review.objects.filter(
            author=self.request.user, recipient=recipient
        ).exists():
            raise ValidationError("Вы уже оставили отзыв этому пользователю.")
        review = serializer.save(author=self.request.user, recipient=recipient)
        # Update average rating
        reviews = Review.objects.filter(recipient=recipient)
        average_rating = reviews.aggregate(Avg("rating"))["rating__avg"] or 0.0
        recipient.average_rating = average_rating
        recipient.save()


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise PermissionDenied("Вы не можете удалить этот отзыв.")
        recipient = instance.recipient
        instance.delete()
        # Update average rating
        reviews = Review.objects.filter(recipient=recipient)
        average_rating = (
            reviews.aggregate(Avg("rating"))["rating__avg"] or 0.0
            if reviews.exists()
            else 0.0
        )
        recipient.average_rating = average_rating
        recipient.save()


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]


class AdminCartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [IsAdminUser]


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]


class AdminMessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().select_related("sender", "recipient")
    serializer_class = MessageSerializer
    permission_classes = [IsAdminUser]


class AdminReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminUser]


class GPTAssistantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query_type = request.data.get("type", "question")

        if query_type == "question":
            messages = request.data.get("messages", [])
            if not messages:
                return Response(
                    {"error": "Messages are required for question type"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Ensure messages is a list of dicts with 'role' and 'text'
            for msg in messages:
                if not isinstance(msg, dict) or "role" not in msg or "text" not in msg:
                    return Response(
                        {"error": "Invalid message format"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        elif query_type == "recipe":
            # Handle redirecting to the recipe endpoint for backwards compatibility
            return self.get_recipe(request)
        elif query_type == "dish_recipe":
            # Handle dish-based recipe requests
            return self.get_dish_recipe(request)
        else:
            return Response(
                {"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Construct the request body
        model_uri = f"gpt://{settings.FOLDER_ID}/yandexgpt-lite"
        request_body = {
            "modelUri": model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": 0.6,
                "maxTokens": 150,
            },
            "messages": messages,
        }

        # Make request to Yandex GPT API
        gpt_url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
        headers = {
            "Authorization": f"Api-Key {settings.API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(gpt_url, headers=headers, json=request_body)
            response.raise_for_status()
            gpt_response = response.json()
            text = gpt_response["result"]["alternatives"][0]["message"]["text"]
            return Response({"response": text})
        except requests.exceptions.RequestException as e:
            error_message = f"Ошибка при запросе к GPT: {str(e)}"
            return Response(
                {"error": error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_recipe(self, request):
        # Get days parameter from request, default to 3
        days = request.data.get("days", 3)
        
        # Calculate date for 'days' days ago
        from_date = timezone.now() - timedelta(days=int(days))
        
        # Get orders from last 'days' days
        orders = Order.objects.filter(
            user=request.user,
            created_at__gte=from_date
        ).prefetch_related("items__product")
        
        if not orders.exists():
            return Response(
                {"response": "У вас нет заказов за последние 3 дня. Попробуйте сделать новый заказ или запросить общий рецепт."},
                status=status.HTTP_200_OK
            )
        
        # Get unique products from orders with quantities
        products_with_quantities = {}
        for order in orders:
            for item in order.items.all():
                if item.product:
                    product_name = item.product.name
                    if product_name in products_with_quantities:
                        products_with_quantities[product_name] += item.quantity
                    else:
                        products_with_quantities[product_name] = item.quantity
        
        # If no products found
        if not products_with_quantities:
            return Response(
                {"response": "Не удалось найти продукты в ваших заказах за последние 3 дня."},
                status=status.HTTP_200_OK
            )
        
        # Format products with quantities
        products_list = ", ".join([f"{name} ({qty} шт.)" for name, qty in products_with_quantities.items()])
        
        # Create a formatted list for the response
        formatted_products = "\n".join([f"- {name}: {qty} шт." for name, qty in products_with_quantities.items()])
        
        # Добавляем случайный элемент для разнообразия рецептов
        recipe_types = [
            "быстрый рецепт",
            "праздничный рецепт",
            "повседневный рецепт",
            "здоровый рецепт",
            "вегетарианский рецепт",
            "рецепт для ужина",
            "рецепт для обеда",
            "рецепт для завтрака"
        ]
        random_recipe_type = random.choice(recipe_types)
        
        prompt = f"""Вы - ИИ-помощник по фермерским продуктам. У пользователя есть следующие продукты из заказов за последние {days} дней: {products_list}. 
Предложите {random_recipe_type}, который можно приготовить из этих продуктов. Предложите полный рецепт с шагами приготовления.

Ваш ответ должен обязательно содержать:
1. Краткое описание блюда
2. Раздел 'Ингредиенты:' с четким перечислением на новых строках в формате 'Название ингредиента - количество и единица измерения (например, Картофель - 500 г или Яйца - 3 шт.)'
3. Раздел 'Приготовление:' с пронумерованными шагами

Важно: 
- Используйте ТОЛЬКО те ингредиенты, которые есть в списке продуктов пользователя
- Не добавляйте дополнительные ингредиенты, которых нет в списке
- Учитывайте количество продуктов, которое есть у пользователя
- Предложите оригинальный и интересный рецепт"""
        
        # Construct the request body for Yandex GPT
        model_uri = f"gpt://{settings.FOLDER_ID}/yandexgpt-lite"
        request_body = {
            "modelUri": model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": 0.8,  # Увеличиваем температуру для большей вариативности
                "maxTokens": 1000,
            },
            "messages": [{"role": "user", "text": prompt}],
        }
        
        # Make request to Yandex GPT API
        gpt_url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
        headers = {
            "Authorization": f"Api-Key {settings.API_KEY}",
            "Content-Type": "application/json",
        }
        
        try:
            response = requests.post(gpt_url, headers=headers, json=request_body)
            response.raise_for_status()
            gpt_response = response.json()
            recipe_text = gpt_response["result"]["alternatives"][0]["message"]["text"]
            
            parsed_ingredients_details = []
            used_products = set()  # Множество для отслеживания использованных продуктов
            
            ingredients_headers = ["Ингредиенты:", "Ингредиенты", "Состав:", "Состав", "Необходимые продукты:"]
            cooking_headers = ["Приготовление:", "Приготовление", "Способ приготовления:", "Инструкция:", "Шаги:"]
            
            ingredients_section_text = ""
            temp_text = recipe_text
            
            # Более надежное извлечение секции ингредиентов
            for header_token in ingredients_headers:
                header_start_idx = temp_text.lower().find(header_token.lower())
                if header_start_idx != -1:
                    text_after_header = temp_text[header_start_idx + len(header_token):]
                    
                    end_section_idx = len(text_after_header) # по умолчанию до конца
                    for cook_header_token in cooking_headers:
                        cook_header_idx = text_after_header.lower().find(cook_header_token.lower())
                        if cook_header_idx != -1:
                            end_section_idx = min(end_section_idx, cook_header_idx)
                    
                    ingredients_section_text = text_after_header[:end_section_idx].strip()
                    break
            
            if ingredients_section_text:
                for line in ingredients_section_text.split("\n"):
                    line = line.strip()
                    if not line: continue
                    
                    # Убираем маркеры списка, если есть
                    if line.startswith("•") or line.startswith("-") or line.startswith("*"):
                        line = line[1:].strip()
                    elif line and line[0].isdigit() and (line[1:3] in [". ", ") "] or (len(line) > 1 and line[1] == '.')):
                         line = line.split('.', 1)[-1].split(')', 1)[-1].strip()

                    # Разделяем название и количество (если есть)
                    # Попробуем несколько разделителей: " - ", " – ", " — ", ":"
                    ingredient_name_part = line
                    quantity_part = ""
                    
                    separators = [" - ", " – ", " — ", ":"] # двоеточие последним, т.к. может быть в названии
                    for sep in separators:
                        if sep in line:
                            parts = line.split(sep, 1)
                            ingredient_name_part = parts[0].strip()
                            if len(parts) > 1:
                                quantity_part = parts[1].strip()
                            break 
                    
                    # Если после очистки имя ингредиента слишком короткое, пропускаем
                    cleaned_for_check = self._clean_ingredient_name(ingredient_name_part)
                    if not cleaned_for_check or len(cleaned_for_check) < 2:
                        continue

                    # Проверяем, есть ли этот ингредиент в списке продуктов пользователя
                    ingredient_found = False
                    matched_product_name = None
                    for product_name in products_with_quantities.keys():
                        if self._clean_ingredient_name(product_name) == cleaned_for_check:
                            ingredient_found = True
                            matched_product_name = product_name
                            break
                    
                    if ingredient_found and matched_product_name not in used_products:
                        used_products.add(matched_product_name)
                        parsed_ingredients_details.append({
                            "original_line": line, # Вся строка как есть
                            "name_from_recipe": ingredient_name_part, # Часть до разделителя
                            "quantity_from_recipe": quantity_part, # Часть после разделителя
                            "matched_product": matched_product_name # Сохраняем название совпавшего продукта
                        })

            all_found_products = []
            aggregated_product_ids = set()

            for ing_detail in parsed_ingredients_details:
                # Используем name_from_recipe для поиска
                products_for_this_ingredient = self._find_products_for_ingredient(
                    ing_detail["name_from_recipe"], 
                    ing_detail["original_line"]
                )
                for p_info in products_for_this_ingredient:
                    if p_info["id"] not in aggregated_product_ids:
                        all_found_products.append(p_info)
                        aggregated_product_ids.add(p_info["id"])
            
            # Сортируем все найденные продукты по уверенности
            all_found_products.sort(key=lambda x: x["confidence"], reverse=True)
            
            # Отправляем клиенту только детали ингредиентов, которые были распарсены
            # и топ N наиболее релевантных уникальных продуктов
            return Response({
                "response": recipe_text,
                "products": all_found_products[:15],  # Увеличим лимит до 15, т.к. фильтруем по уникальности
                "ingredients": parsed_ingredients_details # Отправляем распарсенные строки
            })
        except requests.exceptions.RequestException as e:
            error_message = f"Ошибка при запросе к GPT: {str(e)}"
            return Response(
                {"error": error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _clean_ingredient_name(self, name):
        name = name.lower()
        # Более полный список стоп-слов и единиц измерения
        stop_words = [
            "свежий", "молодой", "старый", "красный", "зеленый", "желтый", "белый", "черный",
            "большой", "маленький", "средний", "один", "два", "три", "несколько", "немного",
            "очень", "слегка", "по вкусу", "для жарки", "для варки", "для салата",
            "очищенный", "нарезанный", "измельченный", "целый",
            "сыр", # Avoid "сыр" being a stop word if it's part of "сливочный сыр"
        ]
        units = [
            "грамм", "граммов", "гр.", "гр", "г.", "г", "миллилитров", "мл.", "мл",
            "килограмм", "кг.", "кг", "литр", "л.", "л", "штук", "шт.", "шт",
            "ст.л.", "ст.л", "ст. ложка", "ст ложка", "столовая ложка", "столовых ложек",
            "ч.л.", "ч.л", "ч. ложка", "ч ложка", "чайная ложка", "чайных ложек",
            "стакан", "стакана", "стаканов", "пачка", "пучок", "щепотка", "упаковка",
            "зубчик", "долька", "головка"
        ]

        # Удаление знаков препинания и цифр вначале
        name = ''.join([c if c.isalpha() or c.isspace() else ' ' for c in name])
        name = ' '.join(name.split()) # Убрать лишние пробелы

        # Удаление единиц измерения (более аккуратно)
        for unit in units:
            name = name.replace(f" {unit} ", " ") # с пробелами по бокам
            if name.endswith(f" {unit}"): name = name[:-len(f" {unit}")].strip()
            if name.startswith(f"{unit} "): name = name[len(f"{unit} "):].strip()
        
        # Удаление стоп-слов
        words = name.split()
        # Filter out stop words, unless it's a single-word ingredient that IS a stop word (e.g. "лук")
        if len(words) > 1:
            cleaned_words = [word for word in words if word not in stop_words or word == "лук"] # "лук" is an exception
        else:
            cleaned_words = words
        name = " ".join(cleaned_words).strip()
        
        # Нормализация некоторых слов (простой вариант)
        normalization_map = {
            "картошка": "картофель",
            "помидоры": "томат", "помидор": "томат",
            "огурцы": "огурец",
            "морковка": "морковь",
            "лучок": "лук",
            "куриная грудка": "куриное филе", "куриные грудки": "куриное филе",
            "яйца": "яйцо",
            "маслины": "оливки", # often used interchangeably in some contexts
            "сметана": "сметана", # keep it as is
            "сыр": "сыр" # keep as is, to be handled by category matching
        }
        for k, v in normalization_map.items():
            if k in name: # more robust replacement
                 # Replace whole word only
                name = (' ' + name + ' ').replace(' ' + k + ' ', ' ' + v + ' ').strip()

        # Попытка привести к единственному числу (очень упрощенно)
        if name.endswith("ы") or name.endswith("и"): name = name[:-1]
        if name.endswith("а") or name.endswith("я") and len(name) > 3 : name = name[:-1]
        
        return name.strip()

    def _find_products_for_ingredient(self, ingredient_name, original_line):
        """
        Ищет продукты в базе данных для данного ингредиента с использованием различных стратегий.
        Возвращает список словарей продуктов с информацией о совпадении.
        """
        cleaned_name = self._clean_ingredient_name(ingredient_name)
        if not cleaned_name or len(cleaned_name) < 2: # Слишком короткое имя для поиска
            return []

        matched_products_info = []
        found_product_ids = set()
        
        # Определяем ожидаемую категорию на основе ключевых слов
        expected_category = None
        for cat_name, keywords in self.ingredient_categories.items():
            if any(kw in cleaned_name.lower() for kw in keywords) or any(kw in ingredient_name.lower() for kw in keywords):
                expected_category = cat_name
                break
        
        # Получаем все продукты в наличии
        all_products = Product.objects.filter(quantity__gt=0)
        
        # Если определена ожидаемая категория, сначала ищем в ней
        if expected_category:
            db_category = Category.objects.filter(name__iexact=expected_category).first()
            if db_category:
                category_products = all_products.filter(category=db_category)
                
                # Используем difflib для поиска похожих названий
                product_names = list(category_products.values_list('name', flat=True))
                matches = difflib.get_close_matches(cleaned_name, product_names, n=5, cutoff=0.8)
                
                for match in matches:
                    product = category_products.get(name=match)
                    if product.id not in found_product_ids:
                        similarity = difflib.SequenceMatcher(None, cleaned_name, match).ratio()
                        match_info = {
                            "id": product.id,
                            "name": product.name,
                            "price": float(product.price),
                            "quantity": product.quantity,
                            "image": product.image.url if product.image else None,
                            "ingredient_original": original_line,
                            "ingredient_cleaned": cleaned_name,
                            "confidence": int(similarity * 100),
                            "match_type": "category_similarity"
                        }
                        matched_products_info.append(match_info)
                        found_product_ids.add(product.id)
        
        # Если не нашли достаточно совпадений в категории или категория не определена,
        # ищем по всем продуктам
        if len(matched_products_info) < 3:
            # Используем difflib для поиска похожих названий среди всех продуктов
            all_product_names = list(all_products.values_list('name', flat=True))
            matches = difflib.get_close_matches(cleaned_name, all_product_names, n=5, cutoff=0.7)
            
            for match in matches:
                product = all_products.get(name=match)
                if product.id not in found_product_ids:
                    similarity = difflib.SequenceMatcher(None, cleaned_name, match).ratio()
                    confidence = int(similarity * 100)
                    
                    # Если продукт из ожидаемой категории, повышаем уверенность
                    if expected_category and product.category and product.category.name == expected_category:
                        confidence = min(100, confidence + 10)
                    
                    match_info = {
                        "id": product.id,
                        "name": product.name,
                        "price": float(product.price),
                        "quantity": product.quantity,
                        "image": product.image.url if product.image else None,
                        "ingredient_original": original_line,
                        "ingredient_cleaned": cleaned_name,
                        "confidence": confidence,
                        "match_type": "similarity_match"
                    }
                    matched_products_info.append(match_info)
                    found_product_ids.add(product.id)
        
        # Если все еще не нашли достаточно совпадений, используем частичное совпадение
        if len(matched_products_info) < 3:
            partial_matches = all_products.filter(
                Q(name__icontains=cleaned_name) | 
                Q(name__icontains=ingredient_name)
            ).exclude(id__in=found_product_ids)
            
            for product in partial_matches[:3]:
                match_info = {
                    "id": product.id,
                    "name": product.name,
                    "price": float(product.price),
                    "quantity": product.quantity,
                    "image": product.image.url if product.image else None,
                    "ingredient_original": original_line,
                    "ingredient_cleaned": cleaned_name,
                    "confidence": 60,  # Базовая уверенность для частичного совпадения
                    "match_type": "partial_match"
                }
                
                # Если продукт из ожидаемой категории, повышаем уверенность
                if expected_category and product.category and product.category.name == expected_category:
                    match_info["confidence"] = 70
                    match_info["match_type"] += "_category"
                
                matched_products_info.append(match_info)
                found_product_ids.add(product.id)
        
        # Сортируем по уверенности и возвращаем
        matched_products_info.sort(key=lambda x: x["confidence"], reverse=True)
        return matched_products_info[:5]  # Не более 5 лучших совпадений на ингредиент

    # Определяем категории ингредиентов (можно вынести в настройки или отдельный файл)
    ingredient_categories = {
        "Мясо": ["говядина", "свинина", "баранина", "телятина", "курица", "индейка", "курин", "филе", "фарш", "бекон", "колбаса", "сосиски", "ветчина"],
        "Рыба": ["рыба", "лосось", "треска", "тунец", "селедка", "форель", "семга", "карп", "скумбрия", "креветки", "мидии", "кальмар"],
        "Овощи": ["картофель", "морковь", "лук", "чеснок", "перец", "томат", "помидор", "огурец", "капуста", "баклажан", "кабачок", "тыква", "редис", "свекла", "брокколи", "цветная капуста", "кукуруза", "горошек"],
        "Фрукты": ["яблоко", "груша", "банан", "апельсин", "лимон", "мандарин", "киви", "авокадо", "виноград", "персик", "слива", "манго", "ананас"],
        "Ягоды": ["клубника", "малина", "смородина", "черника", "ежевика", "клюква", "брусника", "земляника"],
        "Молочные продукты": ["молоко", "сыр", "творог", "сметана", "йогурт", "кефир", "масло сливочное", "сливки", "ряженка", "простокваша"],
        "Сыр": ["сыр", "пармезан", "чеддер", "моцарелла", "гауда", "фета", "бри", "рокфор", "дорблю", "брынза"], # Отдельно для сыров, так как "сыр" часто в названии
        "Мука и Крупы": ["мука", "рис", "гречка", "овсянка", "перловка", "булгур", "киноа", "манка", "пшено", "макароны", "спагетти", "вермишель"],
        "Специи и Приправы": ["соль", "перец", "паприка", "куркума", "корица", "базилик", "орегано", "тимьян", "розмарин", "имбирь", "гвоздика", "мускатный орех", "кардамон", "чили", "лавровый лист", "ваниль", "сахар", "мед", "горчица", "уксус", "соевый соус"],
        "Зелень": ["укроп", "петрушка", "кинза", "базилик", "мята", "зеленый лук", "шпинат", "руккола", "салат", "щавель"],
        "Масла и Жиры": ["масло растительное", "оливковое масло", "подсолнечное масло", "сливочное масло", "маргарин", "жир"],
        "Орехи и Семена": ["орех", "миндаль", "фундук", "грецкий", "кешью", "фисташки", "арахис", "семечки", "кунжут", "лен"],
        "Напитки": ["чай", "кофе", "сок", "вода", "компот"],
        "Консервы": ["консервы", "тушенка", "горошек консервированный", "кукуруза консервированная", "фасоль консервированная", "оливки", "маслины"],
        "Хлебобулочные изделия": ["хлеб", "булка", "лаваш", "батон", "круассан"],
    }

    def get_dish_recipe(self, request):
        dish_name = request.data.get("dish_name")
        if not dish_name:
            return Response(
                {"error": "Необходимо указать название блюда"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        prompt = f"""Вы - шеф-повар, который описывает рецепты. Напишите подробный рецепт для блюда \'{dish_name}\'.
        
Ваш ответ должен обязательно содержать:
1. Краткое описание блюда
2. Раздел 'Ингредиенты:' с четким перечислением на новых строках в формате 'Название ингредиента - количество и единица измерения (например, Картофель - 500 г или Яйца - 3 шт.)'
3. Раздел 'Приготовление:' с пронумерованными шагами
        
Старайтесь указывать базовые ингредиенты (мука, яйца, молоко, соль) и основные продукты (говядина, картофель, морковь и т.д.) без сложных составных частей. 
Не используйте сокращения типа "ст.л.", "ч.л.", пишите "столовая ложка", "чайная ложка".
Указывайте количество основных продуктов в граммах, килограммах, штуках или миллилитрах где это применимо."""
        
        model_uri = f"gpt://{settings.FOLDER_ID}/yandexgpt-lite"
        request_body = {
            "modelUri": model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": 0.5, # немного уменьшим температуру для большей предсказуемости формата
                "maxTokens": 1000, # увеличим для более полных рецептов
            },
            "messages": [{"role": "user", "text": prompt}],
        }
        
        gpt_url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
        headers = {
            "Authorization": f"Api-Key {settings.API_KEY}",
            "Content-Type": "application/json",
        }
        
        try:
            response = requests.post(gpt_url, headers=headers, json=request_body)
            response.raise_for_status()
            gpt_response = response.json()
            recipe_text = gpt_response["result"]["alternatives"][0]["message"]["text"]
            
            parsed_ingredients_details = []
            
            ingredients_headers = ["Ингредиенты:", "Ингредиенты", "Состав:", "Состав", "Необходимые продукты:"]
            cooking_headers = ["Приготовление:", "Приготовление", "Способ приготовления:", "Инструкция:", "Шаги:"]
            
            ingredients_section_text = ""
            temp_text = recipe_text
            
            # Более надежное извлечение секции ингредиентов
            for header_token in ingredients_headers:
                header_start_idx = temp_text.lower().find(header_token.lower())
                if header_start_idx != -1:
                    text_after_header = temp_text[header_start_idx + len(header_token):]
                    
                    end_section_idx = len(text_after_header) # по умолчанию до конца
                    for cook_header_token in cooking_headers:
                        cook_header_idx = text_after_header.lower().find(cook_header_token.lower())
                        if cook_header_idx != -1:
                            end_section_idx = min(end_section_idx, cook_header_idx)
                    
                    ingredients_section_text = text_after_header[:end_section_idx].strip()
                    break
            
            if ingredients_section_text:
                for line in ingredients_section_text.split("\n"):
                    line = line.strip()
                    if not line: continue
                    
                    # Убираем маркеры списка, если есть
                    if line.startswith("•") or line.startswith("-") or line.startswith("*"):
                        line = line[1:].strip()
                    elif line and line[0].isdigit() and (line[1:3] in [". ", ") "] or (len(line) > 1 and line[1] == '.')):
                         line = line.split('.', 1)[-1].split(')', 1)[-1].strip()


                    # Разделяем название и количество (если есть)
                    # Попробуем несколько разделителей: " - ", " – ", " — ", ":"
                    ingredient_name_part = line
                    quantity_part = ""
                    
                    separators = [" - ", " – ", " — ", ":"] # двоеточие последним, т.к. может быть в названии
                    for sep in separators:
                        if sep in line:
                            parts = line.split(sep, 1)
                            ingredient_name_part = parts[0].strip()
                            if len(parts) > 1:
                                quantity_part = parts[1].strip()
                            break 
                    
                    # Если после очистки имя ингредиента слишком короткое, пропускаем
                    cleaned_for_check = self._clean_ingredient_name(ingredient_name_part)
                    if not cleaned_for_check or len(cleaned_for_check) < 2:
                        continue

                    parsed_ingredients_details.append({
                        "original_line": line, # Вся строка как есть
                        "name_from_recipe": ingredient_name_part, # Часть до разделителя
                        "quantity_from_recipe": quantity_part # Часть после разделителя
                    })

            all_found_products = []
            aggregated_product_ids = set()

            for ing_detail in parsed_ingredients_details:
                # Используем name_from_recipe для поиска
                products_for_this_ingredient = self._find_products_for_ingredient(
                    ing_detail["name_from_recipe"], 
                    ing_detail["original_line"]
                )
                for p_info in products_for_this_ingredient:
                    if p_info["id"] not in aggregated_product_ids:
                        all_found_products.append(p_info)
                        aggregated_product_ids.add(p_info["id"])
            
            # Сортируем все найденные продукты по уверенности
            all_found_products.sort(key=lambda x: x["confidence"], reverse=True)
            
            # Отправляем клиенту только детали ингредиентов, которые были распарсены
            # и топ N наиболее релевантных уникальных продуктов
            return Response({
                "response": recipe_text,
                "products": all_found_products[:15],  # Увеличим лимит до 15, т.к. фильтруем по уникальности
                "ingredients": parsed_ingredients_details # Отправляем распарсенные строки
            })
        except requests.exceptions.RequestException as e:
            error_message = f"Ошибка при запросе к GPT: {str(e)}"
            return Response(
                {"error": error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
