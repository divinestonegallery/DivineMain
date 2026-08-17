from django.db import migrations, models


FIELDS = (
    'sculpture_height_inches',
    'sculpture_width_inches',
    'sculpture_depth_inches',
    'min_weight_kg',
    'max_weight_kg',
    'packed_length_inches',
    'packed_width_inches',
    'packed_height_inches',
)


class Migration(migrations.Migration):
    dependencies = [('products', '0005_unique_product_image_object_key')]

    operations = [
        migrations.AddConstraint(
            model_name='productvariant',
            constraint=models.CheckConstraint(
                check=models.Q(gst_rate__range=(0, 100)) | models.Q(gst_rate__isnull=True),
                name='variant_gst_rate_valid',
            ),
        ),
        *[
            migrations.AddConstraint(
                model_name='productvariant',
                constraint=models.CheckConstraint(
                    check=models.Q(**{f'{field}__gt': 0}) | models.Q(**{f'{field}__isnull': True}),
                    name=f'variant_{field}_positive',
                ),
            )
            for field in FIELDS
        ],
    ]
