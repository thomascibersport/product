from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, SellerApplicationSerializer, SellerApplicationImageSerializer, UserMediaSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
import logging

import requests
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import json
from django.db.models import Avg, Max, Min, Count, Sum, FloatField, Value
from django.db.models.functions import Cast, Coalesce, TruncDate
from django.shortcuts import redirect
from django.urls import reverse
from django.contrib.auth import authenticate, login as django_login
from rest_framework import status, generics
from django.utils import timezone

from authentication.serializers import AuthUserSerializer
from .models import SellerApplicationImage, UserMedia

User = get_user_model()
class CustomLoginView(APIView):
    permission_classes = []  # доступ всем

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if user is not None:
            django_login(request, user)
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_admin": user.is_staff
            })
        return Response({"error": "Неверные учётные данные"}, status=status.HTTP_400_BAD_REQUEST)


        
class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = AuthUserSerializer(user, context={'request': request})
        return Response(serializer.data)


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        data = request.data

        # Обновляем стандартные поля
        user.username = data.get("username", user.username)
        user.email = data.get("email", user.email)

        # Обновляем дополнительные поля ФИО и телефон
        user.first_name = data.get("first_name", user.first_name)
        user.last_name = data.get("last_name", user.last_name)
        user.middle_name = data.get("middle_name", user.middle_name)
        user.phone = data.get("phone", user.phone)
        user.show_phone = data.get("show_phone", user.show_phone)
        user.bio = data.get("bio", user.bio)
        user.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "middle_name": user.middle_name,
            "phone": user.phone,
            "bio": user.bio,
        }, status=status.HTTP_200_OK)


class UserMediaView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Get all media files for the current user"""
        media_files = UserMedia.objects.filter(user=request.user)
        serializer = UserMediaSerializer(media_files, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        """Upload a new media file"""
        file = request.FILES.get('file')
        media_type = request.data.get('media_type', 'image')
        title = request.data.get('title', '')
        description = request.data.get('description', '')
        
        if not file:
            return Response({"error": "Файл не загружен"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate media type
        if media_type not in ['image', 'video']:
            return Response({"error": "Недопустимый тип медиа"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file type based on media_type
        if media_type == 'image' and not file.content_type.startswith('image/'):
            return Response({"error": "Файл должен быть изображением"}, status=status.HTTP_400_BAD_REQUEST)
        
        if media_type == 'video' and not file.content_type.startswith('video/'):
            return Response({"error": "Файл должен быть видео"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create media object
        media = UserMedia.objects.create(
            user=request.user,
            file=file,
            media_type=media_type,
            title=title,
            description=description
        )
        
        serializer = UserMediaSerializer(media, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserMediaDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, media_id):
        """Get a specific media file"""
        try:
            media = UserMedia.objects.get(id=media_id, user=request.user)
            serializer = UserMediaSerializer(media, context={'request': request})
            return Response(serializer.data)
        except UserMedia.DoesNotExist:
            return Response({"error": "Медиафайл не найден"}, status=status.HTTP_404_NOT_FOUND)
    
    def delete(self, request, media_id):
        """Delete a media file"""
        try:
            media = UserMedia.objects.get(id=media_id, user=request.user)
            media.file.delete(save=False)  # Delete the actual file
            media.delete()  # Delete the database record
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UserMedia.DoesNotExist:
            return Response({"error": "Медиафайл не найден"}, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request, media_id):
        """Update media title and description"""
        try:
            media = UserMedia.objects.get(id=media_id, user=request.user)
            
            # Update fields
            media.title = request.data.get('title', media.title)
            media.description = request.data.get('description', media.description)
            media.save()
            
            serializer = UserMediaSerializer(media, context={'request': request})
            return Response(serializer.data)
        except UserMedia.DoesNotExist:
            return Response({"error": "Медиафайл не найден"}, status=status.HTTP_404_NOT_FOUND)


logger = logging.getLogger(__name__)

class UploadAvatarView(APIView):
    def post(self, request):
        user = request.user
        file = request.FILES.get('avatar')
        logger.info(f"Получен файл: {file.name if file else 'Нет файла'}")
        
        if not file:
            return Response({"error": "Файл не загружен"}, status=400)
        
        if not file.content_type.startswith('image/'):
            return Response({"error": "Разрешены только изображения"}, status=400)
        
        if file.size > 5 * 1024 * 1024:
            return Response({"error": "Файл слишком большой (макс. 5MB)"}, status=400)
        
        if user.avatar:
            logger.info(f"Удаление старого аватара: {user.avatar.path}")
            user.avatar.delete(save=False)
        
        user.avatar.save(f'avatar_{user.id}.jpg', file, save=True)
        logger.info(f"Новый аватар сохранен: {user.avatar.path}")
        
        return Response({
            "message": "Аватар обновлён",
            "avatar_url": user.avatar.url
        }, status=200)
class UpdatePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not user.check_password(old_password):
            return Response({"error": "Неверный старый пароль."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Пароль успешно изменён."}, status=status.HTTP_200_OK)

class SellerApplicationView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Get current user's seller application"""
        user = request.user
        serializer = SellerApplicationSerializer(user, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        """Submit or update seller application"""
        user = request.user
        
        # Extract image files from request
        images = request.FILES.getlist('images', [])
        
        # Process application data
        seller_description = request.data.get('seller_description', '')
        is_reapplying = request.data.get('is_reapplying') == 'true'
        
        if not seller_description:
            return Response(
                {"error": "Необходимо указать описание деятельности продавца"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user profile
        user.seller_description = seller_description
        
        # Always set status to pending for new applications or reapplications
        if user.seller_status == 'not_applied' or user.seller_status == 'rejected' or is_reapplying:
            user.seller_status = 'pending'
            user.seller_application_date = timezone.now()
            # Clear reject reason if reapplying
            user.seller_reject_reason = None
        
        user.save()
        
        # Save application images
        for image in images:
            SellerApplicationImage.objects.create(user=user, image=image)
        
        serializer = SellerApplicationSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request):
        """Delete an application image"""
        image_id = request.query_params.get('image_id')
        if not image_id:
            return Response({"error": "Не указан ID изображения"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            image = SellerApplicationImage.objects.get(id=image_id, user=request.user)
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SellerApplicationImage.DoesNotExist:
            return Response({"error": "Изображение не найдено"}, status=status.HTTP_404_NOT_FOUND)

class AdminSellerApplicationsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get list of seller applications"""
        status_filter = request.query_params.get('status', 'pending')
        
        if status_filter == 'all':
            # Get all users who have ever applied to be sellers
            applications = User.objects.exclude(seller_status='not_applied')
        else:
            applications = User.objects.filter(seller_status=status_filter)
            
        # Sort by application date, newest first
        applications = applications.order_by('-seller_application_date')
            
        serializer = SellerApplicationSerializer(applications, many=True, context={'request': request})
        return Response(serializer.data)

class AdminSellerApplicationDetailView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, user_id):
        """Get seller application details"""
        try:
            user = User.objects.get(id=user_id)
            serializer = SellerApplicationSerializer(user, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request, user_id):
        """Approve or reject seller application"""
        try:
            user = User.objects.get(id=user_id)
            
            action = request.data.get('action')
            if action not in ['approve', 'reject']:
                return Response({"error": "Недопустимое действие"}, status=status.HTTP_400_BAD_REQUEST)
                
            if action == 'approve':
                user.seller_status = 'approved'
                user.is_seller = True
                user.seller_reject_reason = None
            else:  # reject
                reason = request.data.get('reason')
                if not reason:
                    return Response({"error": "Необходимо указать причину отклонения"}, status=status.HTTP_400_BAD_REQUEST)
                    
                user.seller_status = 'rejected'
                user.is_seller = False
                user.seller_reject_reason = reason
                
            # Always update the application date when status changes
            user.seller_application_date = timezone.now()
            user.save()
            
            serializer = SellerApplicationSerializer(user, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)
