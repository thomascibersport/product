from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SellerApplicationImage, UserMedia

User = get_user_model()
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    is_seller = serializers.BooleanField(read_only=True)
    seller_status = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "avatar", "first_name", "last_name", "middle_name", "phone", "show_phone", "is_seller", "seller_status"]

    def get_avatar(self, obj):
        if obj.avatar:
            return self.context['request'].build_absolute_uri(obj.avatar.url)
        return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'first_name', 'last_name', 'middle_name', 'phone', 'agree_to_terms'
        ]
    
    def validate(self, data):
        if data.get('password') != data.pop('confirm_password'):
            raise serializers.ValidationError("Пароли не совпадают.")
        return data
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            middle_name=validated_data.get('middle_name', ''),
            phone=validated_data.get('phone', ''),
            agree_to_terms=validated_data.get('agree_to_terms', False)
        )
        return user

class AuthUserSerializer(serializers.ModelSerializer):
    is_seller = serializers.BooleanField(read_only=True)
    seller_status = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            "id","username","email","avatar",
            "first_name","last_name","middle_name",
            "phone","show_phone","is_staff", "is_seller", "seller_status"
        ]
        
class SellerApplicationImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SellerApplicationImage
        fields = ['id', 'image', 'image_url', 'uploaded_at']
        read_only_fields = ['uploaded_at']
        
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None

class UserMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'title', 'description', 'uploaded_at']
        read_only_fields = ['uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

class SellerApplicationSerializer(serializers.ModelSerializer):
    images = SellerApplicationImageSerializer(source='seller_images', many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'middle_name', 'phone',
            'seller_description', 'seller_status', 'seller_application_date', 
            'images', 'uploaded_images', 'seller_reject_reason', 'is_seller'
        ]
        read_only_fields = ['seller_status', 'seller_application_date', 'seller_reject_reason', 'is_seller']
        
    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # Update the user instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        from django.utils import timezone
        
        # Set application status and date
        if instance.seller_status == 'not_applied':
            instance.seller_status = 'pending'
            instance.seller_application_date = timezone.now()
            
        instance.save()
        
        # Create image instances
        for image in uploaded_images:
            SellerApplicationImage.objects.create(user=instance, image=image)
            
        return instance