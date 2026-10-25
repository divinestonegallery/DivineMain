from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0010_normalized_image_architecture'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='seo_title',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
        migrations.AddField(
            model_name='product',
            name='seo_description',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
    ]
