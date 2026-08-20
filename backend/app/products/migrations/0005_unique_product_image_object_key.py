from django.db import migrations, models


def normalize_duplicate_object_keys(apps, schema_editor):
    ProductImage = apps.get_model('products', 'ProductImage')
    seen = set()
    for image in ProductImage.objects.exclude(object_key__isnull=True).order_by('id'):
        if image.object_key in seen:
            image.object_key = None
            image.save(update_fields=['object_key'])
        else:
            seen.add(image.object_key)


class Migration(migrations.Migration):
    dependencies = [('products', '0004_catalogue_mvp')]

    operations = [
        migrations.RunPython(normalize_duplicate_object_keys, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='productimage',
            constraint=models.UniqueConstraint(
                condition=models.Q(object_key__isnull=False),
                fields=('object_key',),
                name='unique_product_image_object_key',
            ),
        ),
    ]
