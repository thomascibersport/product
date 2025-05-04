import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from products.models import Product, Order, OrderItem, Category

User = get_user_model()

class Command(BaseCommand):
    help = 'Генерирует тестовые данные для заказов'

    def handle(self, *args, **kwargs):
        # Проверяем наличие пользователей и продуктов
        users = User.objects.all()
        products = Product.objects.all()
        if not users.exists() or not products.exists():
            self.stdout.write(self.style.ERROR('Сначала создайте пользователей и продукты'))
            return

        # Фиксируем диапазон дат
        start_date = datetime(2025, 3, 1)  # Начало: 1 марта 2025
        end_date = datetime(2025, 5, 1)    # Конец: 1 мая 2025

        # Временно отключаем auto_now_add для поля created_at
        created_at_field = Order._meta.get_field('created_at')
        original_auto_now_add = created_at_field.auto_now_add
        created_at_field.auto_now_add = False

        try:
            # Генерация заказов (не более 100)
            for _ in range(100):  # Ограничиваем до 100 заказов
                # Выбираем случайного пользователя
                user = random.choice(users)
                
                # Выбираем случайного фермера (продавца)
                farmer = random.choice(Product.objects.values_list('farmer', flat=True).distinct())
                
                # Фильтруем товары по выбранному фермеру
                farmer_products = products.filter(farmer=farmer)
                if not farmer_products.exists():
                    continue  # Пропускаем, если у фермера нет товаров
                
                delivery_type = random.choice(['delivery', 'pickup'])
                payment_method = random.choice(['card', 'cash'])
                status_choice = random.choice([choice[0] for choice in Order.STATUS_CHOICES])
                
                # Генерация случайной даты в заданном диапазоне
                random_days = random.randint(0, (end_date - start_date).days)
                random_date = start_date + timedelta(days=random_days)
                
                # Добавляем случайное время в течение дня
                random_hour = random.randint(0, 23)
                random_minute = random.randint(0, 59)
                random_second = random.randint(0, 59)
                random_date = random_date.replace(hour=random_hour, minute=random_minute, second=random_second)
                
                # Создаем заказ с указанной датой
                order = Order(
                    user=user,
                    delivery_type=delivery_type,
                    payment_method=payment_method,
                    status=status_choice,
                    total_amount=random.uniform(100, 5000),
                    created_at=random_date
                )
                order.save()  # Сохраняем объект с указанной датой
                
                # Добавляем 1-5 товаров только от выбранного фермера
                for _ in range(random.randint(1, 5)):
                    product = random.choice(farmer_products)
                    quantity = random.randint(1, 10)
                    price = product.price
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        price=price
                    )
        finally:
            # Восстанавливаем auto_now_add после выполнения
            created_at_field.auto_now_add = original_auto_now_add
        
        self.stdout.write(self.style.SUCCESS('✅ Тестовые данные успешно созданы'))