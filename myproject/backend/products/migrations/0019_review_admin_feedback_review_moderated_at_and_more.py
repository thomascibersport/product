# Generated by Django 5.1.1 on 2025-05-31 09:33

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0018_remove_sellerapplicationdocument_application_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='admin_feedback',
            field=models.TextField(blank=True, null=True, verbose_name='Комментарий администратора'),
        ),
        migrations.AddField(
            model_name='review',
            name='moderated_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата модерации'),
        ),
        migrations.AddField(
            model_name='review',
            name='moderated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderated_reviews', to=settings.AUTH_USER_MODEL, verbose_name='Модератор'),
        ),
        migrations.AddField(
            model_name='review',
            name='status',
            field=models.CharField(choices=[('pending', 'На рассмотрении'), ('approved', 'Одобрен'), ('rejected', 'Отклонен')], default='pending', max_length=20, verbose_name='Статус отзыва'),
        ),
    ]
