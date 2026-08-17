from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [('accounts', '0002_customer_is_active_customer_role')]
    operations = [
        migrations.CreateModel(
            name='APIErrorLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('request_id', models.UUIDField(db_index=True)),
                ('method', models.CharField(max_length=10)),
                ('path', models.CharField(max_length=500)),
                ('status_code', models.PositiveSmallIntegerField()),
                ('error_type', models.CharField(blank=True, max_length=150)),
                ('message', models.CharField(blank=True, max_length=1000)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='api_errors', to='accounts.customer')),
            ],
        ),
        migrations.CreateModel(
            name='ProcessedWebhook',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('provider', models.CharField(max_length=40)),
                ('event_id', models.CharField(max_length=255)),
                ('event_type', models.CharField(blank=True, max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='UploadSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('object_key', models.CharField(max_length=500, unique=True)),
                ('purpose', models.CharField(choices=[('product_image', 'Product image'), ('customization_reference', 'Customization reference')], max_length=40)),
                ('expected_content_type', models.CharField(max_length=100)),
                ('expected_size', models.PositiveIntegerField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('attached', 'Attached'), ('rejected', 'Rejected'), ('deleted', 'Deleted')], default='pending', max_length=20)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('attached_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='upload_sessions', to='accounts.customer')),
            ],
        ),
        migrations.CreateModel(
            name='StaffAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('request_id', models.UUIDField(db_index=True)),
                ('method', models.CharField(max_length=10)),
                ('path', models.CharField(max_length=500)),
                ('status_code', models.PositiveSmallIntegerField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='accounts.customer')),
            ],
        ),
        migrations.AddConstraint(
            model_name='processedwebhook',
            constraint=models.UniqueConstraint(fields=('provider', 'event_id'), name='unique_processed_webhook_event'),
        ),
    ]
