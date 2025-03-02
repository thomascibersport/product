from django.urls import path
from .views import (
    ProductList, 
    ProductCreate, 
    CategoryList, 
    ProductDetail, 
    CartItemViewSet,
    OrderViewSet  
)

urlpatterns = [
    path('products/create/', ProductCreate.as_view(), name='product-create'),
    path('products/', ProductList.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetail.as_view(), name='product-detail'),
    path('categories/', CategoryList.as_view(), name='category-list'),
    path('cart/items/', CartItemViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='cart-items'),
    path('cart/items/<int:pk>/', CartItemViewSet.as_view({ 
        'get': 'retrieve',
        'put': 'update',
        'delete': 'destroy'
    }), name='cart-item-detail'),
    path('orders/', OrderViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='orders'),
    path('cart/clear/', OrderViewSet.as_view({'delete': 'clear'}), name='clear-cart'),
]
