from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')  # URL name from your urlpatterns

    def test_successful_registration(self):
        """Test that a user can register successfully with valid data."""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123',
            'confirm_password': 'password123',
            'first_name': 'Test',
            'last_name': 'User',
            'middle_name': 'Middle',
            'phone': '+1234567890',
            'agree_to_terms': True
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.middle_name, 'Middle')
        self.assertEqual(user.phone, '+1234567890')
        self.assertTrue(user.agree_to_terms)
        self.assertTrue(user.check_password('password123'))

    def test_password_mismatch(self):
        """Test that registration fails if passwords do not match."""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password123',
            'confirm_password': 'differentpassword',
            'first_name': 'Test',
            'last_name': 'User',
            'middle_name': 'Middle',
            'phone': '+1234567890',
            'agree_to_terms': True
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Пароли не совпадают.', str(response.data))
        self.assertEqual(User.objects.count(), 0)

    def test_duplicate_username(self):
        """Test that registration fails if username is already taken."""
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='password123'
        )
        data = {
            'username': 'existinguser',
            'email': 'new@example.com',
            'password': 'password123',
            'confirm_password': 'password123',
            'first_name': 'New',
            'last_name': 'User',
            'middle_name': 'Middle',
            'phone': '+1234567890',
            'agree_to_terms': True
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_duplicate_email(self):
        """Test that registration fails if email is already taken."""
        User.objects.create_user(
            username='user1',
            email='duplicate@example.com',
            password='password123'
        )
        data = {
            'username': 'newuser',
            'email': 'duplicate@example.com',
            'password': 'password123',
            'confirm_password': 'password123',
            'first_name': 'New',
            'last_name': 'User',
            'middle_name': 'Middle',
            'phone': '+1234567890',
            'agree_to_terms': True
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(User.objects.count(), 1)