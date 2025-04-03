# Generated by Django 5.1.1 on 2025-04-03 05:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0021_remove_customuser_show_phone_customuser_sshow_phone'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='sshow_phone',
        ),
        migrations.AddField(
            model_name='customuser',
            name='show_phone',
            field=models.BooleanField(default=True, verbose_name='Показывать телефон другим пользователям'),
        ),
    ]
