# Generated by Django 5.1.1 on 2025-02-19 11:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0012_alter_routerecord_average_speed_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='routerecord',
            name='average_speed',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='routerecord',
            name='route_distance',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='routerecord',
            name='route_duration',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='routerecord',
            name='trip_duration',
            field=models.CharField(max_length=20),
        ),
        migrations.AlterField(
            model_name='routerecord',
            name='weather_temperature',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
