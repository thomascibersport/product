# Generated by Django 5.1.1 on 2025-03-28 11:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0011_product_delivery_available'),
    ]

    operations = [
        migrations.RenameField(
            model_name='order',
            old_name='address',
            new_name='delivery_address',
        ),
        migrations.AddField(
            model_name='order',
            name='pickup_address',
            field=models.TextField(blank=True, null=True),
        ),
    ]
