from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_diety_image_optional_diety_on_product'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='home_page_display_order',
            field=models.PositiveIntegerField(db_index=True, default=999),
        ),
        migrations.AddField(
            model_name='diety',
            name='display_order',
            field=models.PositiveIntegerField(db_index=True, default=999),
        ),
    ]
