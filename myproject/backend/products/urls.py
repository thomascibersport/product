from django.urls import path, include
from rest_framework.routers import DefaultRouter
from products.views import (
    ProductList, ProductCreate, CategoryList, ProductDetail, CartItemViewSet,
    OrderViewSet, MyProductsList, UserProductsList, UserProfileView, UpdateProfileView,
    send_message, has_messages, unread_messages_count, user_message_data, ChatListView, ChatListWithDetailsView, ChatMessagesView, UploadFileView,
    MessageDetailView, MessageDeleteView, ReviewListCreateView, ReviewDetailView,
    SellerStatisticsView, 
    AdminUserViewSet, AdminProductViewSet, AdminCategoryViewSet, AdminCartItemViewSet,
    AdminOrderViewSet, AdminMessageViewSet, AdminReviewViewSet, GPTAssistantView,
    ChatMessagesBetweenUsersView
)
from django.conf import settings
from django.conf.urls.static import static
from authentication.views import CurrentUserView

router = DefaultRouter()
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')
router.register(r'admin/products', AdminProductViewSet, basename='admin-products')
router.register(r'admin/categories', AdminCategoryViewSet)
router.register(r'admin/cart-items', AdminCartItemViewSet)
router.register(r'admin/orders', AdminOrderViewSet)
router.register(r'admin/messages', AdminMessageViewSet)
router.register(r'admin/reviews', AdminReviewViewSet)


urlpatterns = [

    path('', include(router.urls)),
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
    path('my-products/', MyProductsList.as_view(), name='my-products'),
    path('orders/<int:pk>/cancel/', OrderViewSet.as_view({'post': 'cancel'}), name='order-cancel'),
    path('orders/seller/', OrderViewSet.as_view({'get': 'seller_orders'}), name='seller-orders'),
    path('orders/<int:pk>/confirm/', OrderViewSet.as_view({'post': 'confirm'}), name='order-confirm'),
    path('api/products/<int:pk>/', ProductDetail.as_view(), name='product-detail'),
    path('users/<int:id>/', UserProfileView.as_view(), name='user-profile'),  
    path('users/<int:user_id>/products/', UserProductsList.as_view(), name='user-products'),
    path('users/update/', UpdateProfileView.as_view(), name='update-profile'),
    path("messages/send/", send_message, name="send_message"),
    path("messages/has-messages/", has_messages, name="has_messages"),
    path("messages/unread-count/", unread_messages_count, name="unread_messages_count"),
    path("messages/chats/", ChatListView.as_view(), name="chat_list"),
    path("messages/chats-with-details/", ChatListWithDetailsView.as_view(), name="chat_list_with_details"),
    path("messages/chat/<int:pk>/", ChatMessagesView.as_view(), name="chat_messages"),
    path("messages/chat/<int:sender_id>/<int:recipient_id>/", ChatMessagesBetweenUsersView.as_view(), name="chat_messages_between_users"),
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('users/messages-data/', user_message_data, name='user_message_data'),
    path('upload/', UploadFileView.as_view(), name='upload-file'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
    path('messages/<int:pk>/delete/', MessageDeleteView.as_view(), name='message-delete'),
    path('users/<int:recipient_id>/reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    path('seller-statistics/', SellerStatisticsView.as_view(), name='seller-statistics'),
    path('assistant/', GPTAssistantView.as_view(), name='gpt-assistant'),
    path('assistant/recipe', GPTAssistantView.as_view(), name='gpt-assistant-recipe'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)