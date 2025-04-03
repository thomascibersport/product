from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser


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
from rest_framework import status

from authentication.serializers import UserSerializer as AuthUserSerializer

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
        user.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "middle_name": user.middle_name,
            "phone": user.phone,
        }, status=status.HTTP_200_OK)




class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        file = request.FILES.get('avatar')

        if not file:
            return Response({"error": "Файл не загружен"}, status=status.HTTP_400_BAD_REQUEST)

        # Проверка типа файла
        if not file.content_type.startswith('image/'):
            return Response({"error": "Разрешены только изображения"}, status=400)

        # Ограничение размера файла (5MB)
        if file.size > 5 * 1024 * 1024:
            return Response({"error": "Файл слишком большой (макс. 5MB)"}, status=400)

        # Удаляем старый аватар
        if user.avatar:
            user.avatar.delete(save=False)

        # Сохраняем новый
        user.avatar.save(f'avatar_{user.id}.jpg', file, save=True)
        
        return Response({
            "message": "Аватар обновлён",
            "avatar_url": user.avatar.url
        }, status=status.HTTP_200_OK)
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
