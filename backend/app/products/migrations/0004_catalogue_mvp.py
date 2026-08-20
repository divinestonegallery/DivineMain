import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.db.models.functions.text


def normalize_existing_catalogue(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductImage = apps.get_model('products', 'ProductImage')
    Product.objects.filter(is_active=False).update(status='archived')

    for model_name in ('Category', 'Material', 'Diety'):
        Model = apps.get_model('products', model_name)
        seen = set()
        for item in Model.objects.order_by('id'):
            base = item.name.strip()
            candidate = base
            counter = 2
            while candidate.casefold() in seen:
                candidate = f'{base} ({counter})'
                counter += 1
            if candidate != item.name:
                item.name = candidate
                item.save(update_fields=['name'])
            seen.add(candidate.casefold())

    product_ids = ProductImage.objects.order_by().values_list('product_id', flat=True).distinct()
    for product_id in product_ids:
        images = list(ProductImage.objects.filter(product_id=product_id).order_by('display_order', 'id'))
        keep_cover = next((image for image in images if image.cover_photo), images[0] if images else None)
        for index, image in enumerate(images):
            updates = []
            if image.display_order < 0:
                image.display_order = index
                updates.append('display_order')
            desired_cover = keep_cover is not None and image.id == keep_cover.id
            if image.cover_photo != desired_cover:
                image.cover_photo = desired_cover
                updates.append('cover_photo')
            if updates:
                image.save(update_fields=updates)


class Migration(migrations.Migration):
    dependencies = [('products', '0003_diety_categories')]
    operations = [
        migrations.CreateModel(
            name='ProductVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=255)),
                ('sku', models.CharField(max_length=100, unique=True)),
                ('price_before_gst', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('gst_rate', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('stock_quantity', models.PositiveIntegerField(default=0)),
                ('availability', models.CharField(choices=[('in_stock', 'In Stock'), ('made_to_order', 'Made to Order'), ('out_of_stock', 'Out of Stock')], default='in_stock', max_length=20)),
                ('sculpture_height_inches', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('sculpture_width_inches', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('sculpture_depth_inches', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('min_weight_kg', models.DecimalField(blank=True, decimal_places=2, max_digits=9, null=True)),
                ('max_weight_kg', models.DecimalField(blank=True, decimal_places=2, max_digits=9, null=True)),
                ('packed_length_inches', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('packed_width_inches', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('packed_height_inches', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='products.product')),
            ],
            options={'ordering': ('display_order', 'id')},
        ),
        migrations.AlterModelOptions(name='diety', options={'verbose_name': 'Deity', 'verbose_name_plural': 'Deities'}),
        migrations.AlterModelOptions(name='productimage', options={'ordering': ('display_order', 'id')}),
        migrations.AddField(model_name='product', name='display_order', field=models.PositiveIntegerField(db_index=True, default=999)),
        migrations.AddField(model_name='product', name='sales_mode', field=models.CharField(choices=[('quote_only', 'Quote only'), ('buy_and_quote', 'Buy and quote'), ('direct_purchase', 'Direct purchase')], default='quote_only', max_length=30)),
        migrations.AddField(model_name='product', name='status', field=models.CharField(choices=[('draft', 'Draft'), ('active', 'Active'), ('archived', 'Archived')], db_index=True, default='draft', max_length=20)),
        migrations.AddField(model_name='productimage', name='content_type', field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(model_name='productimage', name='file_size', field=models.PositiveIntegerField(blank=True, null=True)),
        migrations.AddField(model_name='productimage', name='height', field=models.PositiveIntegerField(blank=True, null=True)),
        migrations.AddField(model_name='productimage', name='width', field=models.PositiveIntegerField(blank=True, null=True)),
        migrations.AlterField(model_name='diety', name='slug', field=models.CharField(max_length=255, unique=True)),
        migrations.AlterField(model_name='material', name='slug', field=models.CharField(max_length=255, unique=True)),
        migrations.RunPython(normalize_existing_catalogue, migrations.RunPython.noop),
        migrations.AddConstraint(model_name='category', constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('name'), name='unique_category_name_ci')),
        migrations.AddConstraint(model_name='diety', constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('name'), name='unique_deity_name_ci')),
        migrations.AddConstraint(model_name='material', constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('name'), name='unique_material_name_ci')),
        migrations.AddConstraint(model_name='productimage', constraint=models.CheckConstraint(check=models.Q(('display_order__gte', 0)), name='product_image_display_order_nonnegative')),
        migrations.AddConstraint(model_name='productimage', constraint=models.UniqueConstraint(condition=models.Q(('cover_photo', True)), fields=('product',), name='one_cover_image_per_product')),
        migrations.AddConstraint(model_name='productvariant', constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('sku'), name='unique_product_variant_sku_ci')),
        migrations.AddConstraint(model_name='productvariant', constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('name'), models.F('product'), name='unique_product_variant_name_ci')),
        migrations.AddConstraint(model_name='productvariant', constraint=models.CheckConstraint(check=models.Q(('price_before_gst__gte', 0), ('price_before_gst__isnull', True), _connector='OR'), name='variant_price_nonnegative')),
        migrations.AddConstraint(model_name='productvariant', constraint=models.CheckConstraint(check=models.Q(('max_weight_kg__gte', models.F('min_weight_kg')), ('max_weight_kg__isnull', True), ('min_weight_kg__isnull', True), _connector='OR'), name='variant_weight_range_valid')),
    ]
