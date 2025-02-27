from django.shortcuts import render
from rest_framework import generics
from .serializers import ProductSerializer
from rest_framework.permissions import IsAuthenticated
from .models import Product

class ProductCreate(generics.CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]  # Только авторизованные пользователи

    def perform_create(self, serializer):
        # Связываем продукт с текущим пользователем (фермером)
        serializer.save(farmer=self.request.user)
class ProductList(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]  # Или настройте по вашим требованиям