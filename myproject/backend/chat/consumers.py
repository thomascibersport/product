import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from products.models import Message
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
import asyncio
import traceback

logger = logging.getLogger(__name__)

User = get_user_model()

# Dictionary to track online users and their channel names
# Format: {user_id: set(channel_names)}
online_users = {}

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        # For user to user chat, we need consistent room names
        # Use the smaller user_id and the larger user_id to create a unique room name
        self.partner_id = int(self.chat_id)
        self.user_id = int(self.user.id)
        
        # Create a consistent room name regardless of who initiates
        user_ids = sorted([self.user_id, self.partner_id])
        self.room_group_name = f'chat_{user_ids[0]}_{user_ids[1]}'

        logger.info(f"User {self.user.id} connecting to chat with user {self.chat_id}")
        logger.info(f"Room group name: {self.room_group_name}")
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Add user to online users
        user_id = str(self.user.id)
        if user_id not in online_users:
            online_users[user_id] = set()
        online_users[user_id].add(self.channel_name)
        
        logger.info(f"Users currently online: {list(online_users.keys())}")
        
        # Broadcast user's online status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'user_id': user_id,
                'status': 'online'
            }
        )

        await self.accept()
        logger.info(f"User {self.user.id} connected to chat room {self.room_group_name}")

    async def disconnect(self, close_code):
        logger.info(f"User {self.user.id} disconnecting from chat {self.room_group_name} with code {close_code}")
        
        # Remove user from online users
        user_id = str(self.user.id)
        if user_id in online_users:
            online_users[user_id].discard(self.channel_name)
            # If no connections left, remove user from online users
            if not online_users[user_id]:
                del online_users[user_id]
                logger.info(f"User {user_id} completely offline")
                
            # Broadcast user's offline status
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_status',
                    'user_id': user_id,
                    'status': 'offline'
                }
            )
                
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        logger.info(f"User {self.user.id} disconnected from chat {self.room_group_name}")
        logger.info(f"Users still online: {list(online_users.keys())}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'message')
            
            logger.debug(f"Received {message_type} from user {self.user.id}")
            
            if message_type == 'message':
                content = text_data_json['content']
                recipient_id = text_data_json['recipient_id']
                
                logger.info(f"User {self.user.id} sending message to {recipient_id}: {content[:30]}...")
                
                # Save message to database
                message = await self.save_message(self.user.id, recipient_id, content)
                
                # Prepare message data
                message_data = {
                    'id': message.id,
                    'content': message.content,
                    'sender': {
                        'id': message.sender.id,
                        'username': message.sender.username,
                        'first_name': message.sender.first_name,
                        'last_name': message.sender.last_name,
                    },
                    'timestamp': message.timestamp.isoformat(),
                    'is_read': False,
                }
                
                # Log active channel layer groups
                logger.debug(f"Broadcasting to group: {self.room_group_name}")
                
                # Send message to the room group
                try:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message',
                            'message': message_data
                        }
                    )
                    logger.info(f"Message from {self.user.id} broadcast to group {self.room_group_name}")
                except Exception as e:
                    logger.error(f"Error sending message to group: {e}")
                    # Direct message to client as fallback
                    await self.send(text_data=json.dumps({
                        'type': 'message',
                        'message': message_data
                    }))
            elif message_type == 'edit':
                message_id = text_data_json['message_id']
                content = text_data_json['content']
                
                logger.info(f"User {self.user.id} editing message {message_id}")
                
                # Update message in database
                success, message = await self.update_message(message_id, content)
                
                if success:
                    # Prepare message data
                    message_data = {
                        'id': message.id,
                        'content': message.content,
                        'timestamp': message.timestamp.isoformat(),
                    }
                    
                    try:
                        # Send updated message to room group
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'message_update',
                                'message': message_data
                            }
                        )
                        logger.info(f"Message update broadcast to group {self.room_group_name}")
                    except Exception as e:
                        logger.error(f"Error broadcasting message update: {e}")
                        # Direct message to client as fallback
                        await self.send(text_data=json.dumps({
                            'type': 'update',
                            'message': message_data
                        }))
                else:
                    logger.warning(f"Failed to update message {message_id}")
                    
            elif message_type == 'delete':
                message_id = text_data_json['message_id']
                
                logger.info(f"User {self.user.id} deleting message {message_id}")
                
                # Delete message from database
                success = await self.delete_message(message_id)
                
                if success:
                    try:
                        # Send delete notification to room group
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'message_delete',
                                'message_id': message_id
                            }
                        )
                        logger.info(f"Message deletion broadcast to group {self.room_group_name}")
                    except Exception as e:
                        logger.error(f"Error broadcasting message deletion: {e}")
                        # Direct message to client as fallback
                        await self.send(text_data=json.dumps({
                            'type': 'delete',
                            'message_id': message_id
                        }))
                else:
                    logger.warning(f"Failed to delete message {message_id}")
            elif message_type == 'check_online':
                partner_id = text_data_json.get('partner_id')
                if partner_id:
                    is_online = str(partner_id) in online_users
                    logger.info(f"Checking if user {partner_id} is online: {is_online}")
                    await self.send(text_data=json.dumps({
                        'type': 'online_status',
                        'user_id': partner_id,
                        'is_online': is_online
                    }))
            elif message_type == 'mark_read':
                message_ids = text_data_json.get('message_ids', [])
                if message_ids:
                    logger.info(f"Marking messages as read: {message_ids}")
                    success = await self.mark_messages_read(message_ids)
                    if success:
                        logger.info(f"Successfully marked messages as read")
                        # Notify both users that messages were read
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'messages_read',
                                'message_ids': message_ids,
                                'reader_id': self.user.id
                            }
                        )
        except Exception as e:
            logger.error(f"Error in receive method: {str(e)}")
            logger.error(traceback.format_exc())

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        
        # Send message to WebSocket
        logger.debug(f"Sending message {message['id']} to user {self.user.id}")
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message
        }))
    
    # Receive message update from room group
    async def message_update(self, event):
        message = event['message']
        
        # Send update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'update',
            'message': message
        }))
    
    # Receive message delete from room group
    async def message_delete(self, event):
        message_id = event['message_id']
        
        # Send delete to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'delete',
            'message_id': message_id
        }))
    
    # Receive user status update
    async def user_status(self, event):
        # Send user status to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'status',
            'user_id': event['user_id'],
            'status': event['status']
        }))
    
    # Receive messages read notification
    async def messages_read(self, event):
        # Send read notification to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'message_ids': event['message_ids'],
            'reader_id': event['reader_id']
        }))
    
    @database_sync_to_async
    def save_message(self, sender_id, recipient_id, content):
        sender = User.objects.get(id=sender_id)
        recipient = User.objects.get(id=recipient_id)
        message = Message.objects.create(
            sender=sender,
            recipient=recipient,
            content=content
        )
        return message
    
    @database_sync_to_async
    def update_message(self, message_id, content):
        try:
            message = Message.objects.get(id=message_id, sender=self.user)
            message.content = content
            message.save()
            return True, message
        except Message.DoesNotExist:
            return False, None
    
    @database_sync_to_async
    def delete_message(self, message_id):
        try:
            message = Message.objects.get(id=message_id, sender=self.user)
            message.delete()
            return True
        except Message.DoesNotExist:
            return False
            
    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        try:
            # Mark messages as read in the database
            Message.objects.filter(
                id__in=message_ids,
                recipient=self.user,
                is_read=False
            ).update(is_read=True)
            return True
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}")
            return False 