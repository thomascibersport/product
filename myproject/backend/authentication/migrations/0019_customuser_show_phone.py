# Generated by Django 5.1.1 on 2025-04-02 10:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0018_alter_customuser_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='show_phone',
            field=models.BooleanField(default=True, verbose_name='Показывать телефон другим пользователям'),
        ),
    ]
