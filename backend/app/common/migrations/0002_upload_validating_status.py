from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('common', '0001_initial')]

    operations = [
        migrations.AlterField(
            model_name='uploadsession',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('validating', 'Validating'),
                    ('attached', 'Attached'),
                    ('rejected', 'Rejected'),
                    ('deleted', 'Deleted'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]
