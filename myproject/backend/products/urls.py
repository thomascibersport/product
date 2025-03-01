from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import ProductList, ProductCreate, CategoryList, ProductDetail, CartItemViewSet

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
]
