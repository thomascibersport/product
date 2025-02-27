# Generated by Django 5.1.1 on 2025-02-27 19:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('authentication', '0014_warehouse_alter_customuser_groups_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('category', models.CharField(max_length=50)),
            ],
        ),
        migrations.RemoveField(
            model_name='routerecord',
            name='user',
        ),
        migrations.DeleteModel(
            name='Warehouse',
        ),
        migrations.AlterField(
            model_name='customuser',
            name='groups',
            field=models.ManyToManyField(blank=True, related_name='customuser_set', to='auth.group'),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='user_permissions',
            field=models.ManyToManyField(blank=True, related_name='customuser_permissions_set', to='auth.permission'),
        ),
        migrations.DeleteModel(
            name='RouteRecord',
        ),
    ]
