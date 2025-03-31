from django.urls import path
from .views import (
    ProductList, 
    ProductCreate, 
    CategoryList, 
    ProductDetail, 
    CartItemViewSet,
    OrderViewSet,
    MyProductsList,
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
    path('cart/clear/', CartItemViewSet.as_view({'delete': 'clear'}), name='clear-cart'),
    # Исправленная строка:
    path('my-products/', MyProductsList.as_view(), name='my-products'),
    path('orders/<int:pk>/cancel/', OrderViewSet.as_view({'post': 'cancel'}), name='order-cancel'),
    path('orders/seller/', OrderViewSet.as_view({'get': 'seller_orders'}), name='seller-orders'),
    path('orders/<int:pk>/confirm/', OrderViewSet.as_view({'post': 'confirm'}), name='order-confirm'),
]