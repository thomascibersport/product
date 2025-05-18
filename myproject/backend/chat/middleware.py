from channels.middleware import BaseMiddleware
from django.db import close_old_connections
from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
import jwt
from django.conf import settings
from channels.db import database_sync_to_async

User = get_user_model()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        close_old_connections()
        
        # Get token from query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [''])[0]
        
        # Set user as anonymous by default
        scope['user'] = AnonymousUser()
        
        # Try to authenticate with token
        if token:
            try:
                # This will validate the token (AccessToken will raise an exception if the token is invalid)
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                
                # Get the user
                user = await self.get_user(user_id)
                if user:
                    scope['user'] = user
            except (InvalidToken, TokenError, jwt.PyJWTError) as e:
                pass
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

def JwtAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner) 