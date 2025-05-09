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
        users = list(User.objects.all())
        products = Product.objects.all()
        if not users or not products.exists():
            self.stdout.write(self.style.ERROR('Сначала создайте пользователей и продукты'))
            return

        # Фиксируем диапазон дат
        start_date = datetime(2024, 5, 1)  
        end_date = datetime(2025, 5, 1)    

        # Временно отключаем auto_now_add для поля created_at
        created_at_field = Order._meta.get_field('created_at')
        original_auto_now_add = created_at_field.auto_now_add
        created_at_field.auto_now_add = False

        try:
            # Определяем причины отмены
            seller_cancel_reasons = [
                "Товар отсутствует на складе",
                "Неправильная цена",
                "Техническая ошибка",
            ]
            buyer_cancel_reasons = [
                "Покупатель передумал",
                "Нашел лучшее предложение",
                "Другое",
            ]

            # Генерация заказов (не более 100)
            for _ in range(100):
                user = random.choice(users)
                farmers = list(Product.objects.exclude(farmer=user).values_list('farmer', flat=True).distinct())
                if not farmers:
                    continue

                farmer = random.choice(farmers)
                farmer_user = User.objects.get(id=farmer)
                farmer_products = list(Product.objects.filter(farmer=farmer))
                if not farmer_products:
                    continue

                delivery_type = random.choice(['delivery', 'pickup'])
                payment_method = random.choice(['card', 'cash'])
                status_choice = random.choice([choice[0] for choice in Order.STATUS_CHOICES])

                # Генерация случайной даты
                random_days = random.randint(0, (end_date - start_date).days)
                random_date = start_date + timedelta(days=random_days)
                random_hour = random.randint(0, 23)
                random_minute = random.randint(0, 59)
                random_second = random.randint(0, 59)
                random_date = random_date.replace(hour=random_hour, minute=random_minute, second=random_second)

                # Создаем заказ
                order = Order(user=user, delivery_type=delivery_type, payment_method=payment_method, status=status_choice, created_at=random_date)

                if delivery_type == 'pickup':
                    order.pickup_address = farmer_user.address
                elif delivery_type == 'delivery':
                    order.delivery_address = user.address

                if status_choice == 'canceled':
                    canceled_by = random.choice([user, farmer_user])
                    order.canceled_by = canceled_by
                    if canceled_by == farmer_user:
                        order.cancel_reason = random.choice(seller_cancel_reasons)
                    else:
                        order.cancel_reason = random.choice(buyer_cancel_reasons)

                # Выбираем уникальные продукты
                num_items = random.randint(1, min(5, len(farmer_products)))
                selected_products = random.sample(farmer_products, num_items)
                order_items = []

                for product in selected_products:
                    quantity = random.randint(1, 10)
                    price = product.price
                    order_item = OrderItem(order=order, product=product, quantity=quantity, price=price)
                    order_items.append(order_item)

                # Вычисляем общую сумму
                total_amount = sum(item.quantity * item.price for item in order_items)
                order.total_amount = total_amount

                # Сохраняем заказ и элементы
                order.save()
                for item in order_items:
                    item.save()

        finally:
            # Восстанавливаем auto_now_add
            created_at_field.auto_now_add = original_auto_now_add

        self.stdout.write(self.style.SUCCESS('✅ Тестовые данные успешно созданы'))