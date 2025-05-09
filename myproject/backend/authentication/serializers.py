from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "avatar", "first_name", "last_name", "middle_name", "phone", "show_phone"]

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
    class Meta:
        model = User
        fields = [
            "id","username","email","avatar",
            "first_name","last_name","middle_name",
            "phone","show_phone","is_staff"
        ]