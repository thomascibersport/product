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
)
from django.conf import settings
from django.db.models.functions import ExtractHour, TruncMonth, ExtractIsoWeekDay, TruncDate, ExtractMonth, ExtractWeekDay
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
        file_name = default_storage.save(file.name, ContentFile(file.read()))
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
            status__in=["confirmed", "shipped", "in_transit", "delivered"],
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
        
        prompt = f"Вы - ИИ-помощник по фермерским продуктам. У пользователя есть следующие продукты из заказов за последние {days} дней: {products_list}. Предложите рецепт, который можно приготовить из этих продуктов. Предложите полный рецепт с шагами приготовления."
        
        # Construct the request body for Yandex GPT
        model_uri = f"gpt://{settings.FOLDER_ID}/yandexgpt-lite"
        request_body = {
            "modelUri": model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": 0.6,
                "maxTokens": 500,  # Increased token count for detailed recipe
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
            text = gpt_response["result"]["alternatives"][0]["message"]["text"]
            
            # Add the product list to the beginning of the response
            final_response = f"Доступные продукты:\n{formatted_products}\n\n{text}"
            
            return Response({
                "response": final_response,
                "products": [{"name": name, "quantity": qty} for name, qty in products_with_quantities.items()]
            })
        except requests.exceptions.RequestException as e:
            error_message = f"Ошибка при запросе к GPT: {str(e)}"
            return Response(
                {"error": error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_dish_recipe(self, request):
        dish_name = request.data.get("dish_name")
        if not dish_name:
            return Response(
                {"error": "Необходимо указать название блюда"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Improved prompt for more structured recipe format
        prompt = f"""Вы - шеф-повар, который описывает рецепты. Напишите подробный рецепт для блюда '{dish_name}'.
        
Ваш ответ должен обязательно содержать:
1. Краткое описание блюда
2. Раздел 'Ингредиенты:' с четким перечислением на новых строках в формате 'Название ингредиента - количество'
3. Раздел 'Приготовление:' с пронумерованными шагами
        
Старайтесь указывать базовые ингредиенты (мука, яйца, молоко, соль) и основные продукты (говядина, картофель, морковь и т.д.) без сложных составных частей."""
        
        # Construct the request body for Yandex GPT
        model_uri = f"gpt://{settings.FOLDER_ID}/yandexgpt-lite"
        request_body = {
            "modelUri": model_uri,
            "completionOptions": {
                "stream": False,
                "temperature": 0.6,
                "maxTokens": 800,  # Increased token count for detailed recipe
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
            
            # Extract ingredients from the recipe with improved parsing
            ingredients = []
            ingredient_details = []
            
            # Common variations of the ingredients section heading
            ingredients_headers = ["Ингредиенты:", "Ингредиенты", "Состав:", "Состав", "Необходимые продукты:"]
            cooking_headers = ["Приготовление:", "Приготовление", "Способ приготовления:", "Инструкция:", "Шаги:"]
            
            # Find the ingredients section
            ingredients_section_start = None
            ingredients_section_end = None
            
            for header in ingredients_headers:
                if header in recipe_text:
                    ingredients_section_start = recipe_text.find(header) + len(header)
                    break
            
            if ingredients_section_start:
                # Find the beginning of the cooking section to mark the end of ingredients
                for header in cooking_headers:
                    if header in recipe_text[ingredients_section_start:]:
                        ingredients_section_end = recipe_text.find(header, ingredients_section_start)
                        break
                
                if ingredients_section_end:
                    ingredients_section = recipe_text[ingredients_section_start:ingredients_section_end].strip()
                else:
                    # If cooking section not found, take all text until the end or a double newline
                    double_newline = recipe_text.find("\n\n", ingredients_section_start)
                    if double_newline != -1:
                        ingredients_section = recipe_text[ingredients_section_start:double_newline].strip()
                    else:
                        ingredients_section = recipe_text[ingredients_section_start:].strip()
                
                # Process each line in the ingredients section
                for line in ingredients_section.split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Skip bullets and numbering
                    if line.startswith("•") or line.startswith("-") or line.startswith("*"):
                        line = line[1:].strip()
                    elif line[0].isdigit() and line[1:3] in [". ", ") ", ". "]:
                        line = line[3:].strip()
                    
                    # Remember the original line for display
                    original_line = line
                    
                    # Extract the main ingredient name, handling various separators
                    separators = [" - ", " – ", " — ", ": ", " (", ",", " для "]
                    main_part = line
                    
                    for sep in separators:
                        if sep in line:
                            main_part = line.split(sep)[0]
                            break
                    
                    # Clean up the ingredient name by removing quantities and units
                    units = [
                        "грамм", " г.", " г ", "мл", "кг", "л", "шт", "штук", "штуки",
                        "ст.л", "ст. л", "ч.л", "ч. л", "столов", "чайн", "ложк", "ложек", 
                        "стакан", "пачка", "пучок", "щепотка", "по вкусу", "упаковка", "литр"
                    ]
                    
                    # Replace units with space to avoid word concatenation
                    for unit in units:
                        main_part = main_part.replace(unit, " ")
                    
                    # Remove digits
                    clean_ingredient = ''.join([c if not c.isdigit() else ' ' for c in main_part])
                    
                    # Clean up spaces and other characters
                    clean_ingredient = clean_ingredient.replace('/', ' ').replace('\\', ' ')
                    clean_ingredient = ' '.join(clean_ingredient.split())
                    clean_ingredient = clean_ingredient.strip('- \t./')
                    
                    # Only add if we have a valid ingredient name
                    if clean_ingredient and len(clean_ingredient) > 2:
                        ingredients.append(clean_ingredient)
                        ingredient_details.append({
                            "original": original_line,
                            "name": clean_ingredient
                        })
            
            # Detect common ingredient synonyms and categories
            ingredient_categories = {
                "мясо": ["говядина", "свинина", "баранина", "телятина", "курица", "индейка", "курин", "куриное филе", "фарш"],
                "рыба": ["лосось", "треска", "тунец", "селедка", "форель", "семга", "карп"],
                "овощи": ["картофель", "картошка", "морковь", "лук", "чеснок", "перец", "томат", "помидор", "огурец", "капуста", "баклажан", "кабачок"],
                "фрукты": ["яблоко", "груша", "банан", "апельсин", "лимон", "киви", "авокадо"],
                "молочные": ["молоко", "сыр", "творог", "сметана", "йогурт", "кефир", "масло сливочное", "сливки"],
                "мука": ["пшеничная", "ржаная", "кукурузная", "овсяная"],
                "крупы": ["рис", "гречка", "овсянка", "перловка", "булгур", "киноа"],
                "специи": ["соль", "перец", "паприка", "куркума", "корица", "базилик", "орегано", "тимьян"],
                "зелень": ["укроп", "петрушка", "кинза", "базилик", "мята", "зеленый лук"]
            }
            
            # Search for products in database that match ingredients
            available_products = []
            available_products_ids = set()  # To avoid duplicates
            
            # First loop: Find exact matches by name and category
            for ingredient in ingredients:
                # First try exact match by name
                products = Product.objects.filter(name__iexact=ingredient)
                
                # Create a confidence score for each product
                product_matches = []
                
                if products.exists():
                    for product in products.distinct()[:3]:
                        if product.id not in available_products_ids:
                            product_matches.append({
                                "product": product,
                                "confidence": 100,  # Exact match has 100% confidence
                                "match_type": "exact"
                            })
                            available_products_ids.add(product.id)
                
                # Try category match if we have less than 3 products
                if len(product_matches) < 3:
                    # Find the relevant category for this ingredient
                    potential_categories = []
                    for category_name, items in ingredient_categories.items():
                        for item in items:
                            if item in ingredient.lower():
                                potential_categories.append(category_name)
                                break
                    
                    if potential_categories:
                        # Find products in the matching categories
                        for category_name in potential_categories:
                            if len(product_matches) >= 3:
                                break
                                
                            # Find category objects with similar names
                            categories = Category.objects.filter(name__icontains=category_name)
                            if categories.exists():
                                category_products = Product.objects.filter(category__in=categories)
                                
                                # Order by name similarity to the ingredient
                                for product in category_products.distinct()[:3]:
                                    if product.id not in available_products_ids and len(product_matches) < 3:
                                        # Calculate word similarity for confidence
                                        ingredient_words = set(ingredient.lower().split())
                                        product_words = set(product.name.lower().split())
                                        common_words = ingredient_words.intersection(product_words)
                                        
                                        if common_words:
                                            confidence = min(90, (len(common_words) / len(ingredient_words)) * 100)
                                            product_matches.append({
                                                "product": product,
                                                "confidence": confidence,
                                                "match_type": "category"
                                            })
                                            available_products_ids.add(product.id)
                
                # If we still have less than 3 products, try partial matching
                if len(product_matches) < 3:
                    # Try contains match (partial match)
                    products = Product.objects.filter(name__icontains=ingredient)
                    for product in products.distinct():
                        if product.id not in available_products_ids and len(product_matches) < 3:
                            # Calculate what percentage of the product name is the ingredient
                            confidence = min(80, (len(ingredient) / len(product.name)) * 100)
                            product_matches.append({
                                "product": product,
                                "confidence": confidence,
                                "match_type": "partial"
                            })
                            available_products_ids.add(product.id)
                
                # If still no matches, try word-by-word matching for longer words
                if len(product_matches) < 3:
                    for word in ingredient.split():
                        if len(word) > 3:  # Only search for words with more than 3 characters
                            word_products = Product.objects.filter(name__icontains=word)
                            for product in word_products.distinct():
                                if product.id not in available_products_ids and len(product_matches) < 3:
                                    confidence = min(70, (len(word) / len(product.name)) * 100)
                                    product_matches.append({
                                        "product": product,
                                        "confidence": confidence,
                                        "match_type": "word"
                                    })
                                    available_products_ids.add(product.id)
                
                # Sort by confidence and add top matches
                product_matches.sort(key=lambda x: x["confidence"], reverse=True)
                
                # Add the best matches to the response
                for match in product_matches[:3]:  # At most 3 matches per ingredient
                    product = match["product"]
                    available_products.append({
                        "id": product.id,
                        "name": product.name,
                        "price": float(product.price),
                        "quantity": product.quantity,
                        "image": product.image.url if product.image else None,
                        "ingredient": ingredient,
                        "confidence": match["confidence"],
                        "match_type": match["match_type"]
                    })
            
            # Sort products by confidence score
            available_products.sort(key=lambda x: x["confidence"], reverse=True)
            
            # Return only unique products to avoid redundancy
            unique_products = []
            seen_ids = set()
            
            for product in available_products:
                if product["id"] not in seen_ids:
                    unique_products.append(product)
                    seen_ids.add(product["id"])
            
            return Response({
                "response": recipe_text,
                "products": unique_products[:10],  # Limit to top 10 most relevant products
                "ingredients": ingredient_details
            })
        except requests.exceptions.RequestException as e:
            error_message = f"Ошибка при запросе к GPT: {str(e)}"
            return Response(
                {"error": error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
