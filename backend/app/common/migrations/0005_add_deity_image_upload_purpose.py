from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0004_add_category_image_upload_purpose'),
    ]

    operations = [
        migrations.AlterField(
            model_name='uploadsession',
            name='purpose',
            field=models.CharField(
                choices=[
                    ('product_image', 'Product image'),
                    ('category_image', 'Category image'),
                    ('deity_image', 'Deity image'),
                    ('customization_reference', 'Customization reference'),
                ],
                max_length=40,
            ),
        ),
    ]
