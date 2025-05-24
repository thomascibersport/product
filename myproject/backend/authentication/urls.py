from django.urls import path
from .views import (
    RegisterView, CustomLoginView, LogoutView, CurrentUserView, 
    UpdateProfileView, UploadAvatarView, UpdatePasswordView,
    SellerApplicationView, AdminSellerApplicationsView, 
    AdminSellerApplicationDetailView, UserMediaView, UserMediaDetailView
)
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("user/", CurrentUserView.as_view(), name="user"),
    path("login/", CustomLoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/update/", UpdateProfileView.as_view(), name="profile_update"),
    path("upload-avatar/", UploadAvatarView.as_view(), name="upload-avatar"),
    path("update-password/", UpdatePasswordView.as_view(), name="update-password"),
    
    # Seller application endpoints
    path('seller-application/', SellerApplicationView.as_view(), name='seller_application'),
    path('admin/seller-applications/', AdminSellerApplicationsView.as_view(), name='admin_seller_applications'),
    path('admin/seller-applications/<int:user_id>/', AdminSellerApplicationDetailView.as_view(), name='admin_seller_application_detail'),
    
    # User media endpoints
    path('user-media/', UserMediaView.as_view(), name='user_media'),
    path('user-media/<int:media_id>/', UserMediaDetailView.as_view(), name='user_media_detail'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)