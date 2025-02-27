from django.urls import path
from .views import ProductList
from django.conf import settings
from django.conf.urls.static import static
from .views import ProductCreate
urlpatterns = [
    path('products/create/', ProductCreate.as_view(), name='product-create'),
    path('products/', ProductList.as_view(), name='product-list'),
]