# Generated by Django 5.1.1 on 2025-06-03 07:57

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0020_alter_review_unique_together_and_more'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='review',
            name='unique_approved_review',
        ),
        migrations.RemoveField(
            model_name='review',
            name='admin_feedback',
        ),
        migrations.RemoveField(
            model_name='review',
            name='moderated_at',
        ),
        migrations.RemoveField(
            model_name='review',
            name='moderated_by',
        ),
    ]
