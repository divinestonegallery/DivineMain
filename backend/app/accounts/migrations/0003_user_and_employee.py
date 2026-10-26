import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """Rename Customer to User and add an empty Employee table.

    This does not copy staff or admin rows, does not create employees from
    the old role column, and does not move Clerk subjects. Legacy account
    rows are removed by accounts.0004 after every dependent foreign key has
    been detached. Applying 0003 alone leaves the old rows in place; the
    supported rollout applies 0003 and 0004 together.
    """

    dependencies = [
        ('accounts', '0002_customer_is_active_customer_role'),
        # These apps still create foreign keys to Customer. The rename has to
        # run after those migrations, then each app retargets the constraint.
        ('leads', '0005_login_touchpoint'),
        ('common', '0005_add_deity_image_upload_purpose'),
        ('orders', '0001_initial'),
        ('reviews', '0002_moderation_status'),
        ('contactus', '0004_website_lead_intake'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Customer',
            new_name='User',
        ),
        migrations.AlterField(
            model_name='user',
            name='clerk_user_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.CreateModel(
            name='Employee',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('clerk_user_id', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('role', models.CharField(choices=[('staff', 'Staff'), ('admin', 'Admin')], max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='employee', to='accounts.user')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RemoveField(
            model_name='user',
            name='role',
        ),
    ]
