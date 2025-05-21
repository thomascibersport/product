# Generated manually for review moderation

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_remove_orderitem_cancel_reason_and_more'),  # Updated to reference the correct migration
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_moderated',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='review',
            name='moderation_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Ожидает проверки'),
                    ('approved', 'Одобрен'),
                    ('rejected', 'Отклонен'),
                ],
                default='pending',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='review',
            name='moderation_notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='review',
            name='ai_suggestion',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='review',
            name='moderated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='review',
            name='moderated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='moderated_reviews',
                to='authentication.CustomUser'
            ),
        ),
        migrations.AddField(
            model_name='review',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ] 