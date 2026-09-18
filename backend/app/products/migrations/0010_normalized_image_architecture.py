"""
Migration: Normalized Image Architecture

Steps:
1. Create the central `Image` table
2. Create `CategoryImage` and `DietyImage` junction tables
3. Data migration:
   a. Seed Image records from existing ProductImage rows
   b. Seed Image records from Category.image_url / Diety.image_url
4. Add `image` FK to ProductImage (non-nullable after data copy)
5. Remove old inline columns from ProductImage
6. Remove image_url from Category and Diety
"""
import django.db.models.deletion
from django.db import migrations, models


# ---------------------------------------------------------------------------
# Data migration helpers
# ---------------------------------------------------------------------------

def _migrate_product_images(apps, schema_editor):
    """Create Image records for every existing ProductImage row."""
    Image = apps.get_model('products', 'Image')
    ProductImage = apps.get_model('products', 'ProductImage')

    object_key_seen = set()
    for pi in ProductImage.objects.all().order_by('id'):
        if not pi.image_url:
            continue  # skip empty rows

        # Deduplicate by object_key (unique constraint on Image)
        if pi.object_key and pi.object_key in object_key_seen:
            # Reuse the existing Image record
            img = Image.objects.get(object_key=pi.object_key)
        else:
            img = Image.objects.create(
                image_url=pi.image_url,
                object_key=pi.object_key or None,
                alt_text=pi.alt_text or '',
                content_type=pi.content_type or '',
                file_size=pi.file_size,
                width=pi.width,
                height=pi.height,
            )
            if pi.object_key:
                object_key_seen.add(pi.object_key)

        pi.image_id = img.id
        pi.save(update_fields=['image_id'])


def _migrate_category_images(apps, schema_editor):
    """Create Image + CategoryImage records from Category.image_url."""
    Image = apps.get_model('products', 'Image')
    Category = apps.get_model('products', 'Category')
    CategoryImage = apps.get_model('products', 'CategoryImage')

    for cat in Category.objects.exclude(image_url__isnull=True).exclude(image_url=''):
        # Derive a best-guess object_key from the URL (may be None for legacy URLs)
        img = Image.objects.create(
            image_url=cat.image_url,
            object_key=None,  # legacy URL — no object key
            alt_text=cat.name,
        )
        CategoryImage.objects.create(category=cat, image=img)


def _migrate_diety_images(apps, schema_editor):
    """Create Image + DietyImage records from Diety.image_url."""
    Image = apps.get_model('products', 'Image')
    Diety = apps.get_model('products', 'Diety')
    DietyImage = apps.get_model('products', 'DietyImage')

    for deity in Diety.objects.exclude(image_url__isnull=True).exclude(image_url=''):
        img = Image.objects.create(
            image_url=deity.image_url,
            object_key=None,
            alt_text=deity.name,
        )
        DietyImage.objects.create(diety=deity, image=img)


def _run_forward(apps, schema_editor):
    _migrate_product_images(apps, schema_editor)
    _migrate_category_images(apps, schema_editor)
    _migrate_diety_images(apps, schema_editor)


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_home_page_display_order_diety_display_order'),
    ]

    operations = [
        # ── 1. Create Image table ────────────────────────────────────────────
        migrations.CreateModel(
            name='Image',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('image_url', models.URLField(max_length=1024)),
                ('object_key', models.CharField(blank=True, max_length=500, null=True)),
                ('alt_text', models.CharField(blank=True, max_length=255)),
                ('content_type', models.CharField(blank=True, max_length=100)),
                ('file_size', models.PositiveIntegerField(blank=True, null=True)),
                ('width', models.PositiveIntegerField(blank=True, null=True)),
                ('height', models.PositiveIntegerField(blank=True, null=True)),
            ],
            options={'abstract': False},
        ),
        migrations.AddConstraint(
            model_name='image',
            constraint=models.UniqueConstraint(
                condition=models.Q(object_key__isnull=False),
                fields=('object_key',),
                name='unique_image_object_key',
            ),
        ),

        # ── 2. Create CategoryImage table ────────────────────────────────────
        migrations.CreateModel(
            name='CategoryImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='category_image',
                    to='products.category',
                )),
                ('image', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='category_images',
                    to='products.image',
                )),
            ],
            options={'abstract': False},
        ),

        # ── 3. Create DietyImage table ───────────────────────────────────────
        migrations.CreateModel(
            name='DietyImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('diety', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='diety_image',
                    to='products.diety',
                )),
                ('image', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='diety_images',
                    to='products.image',
                )),
            ],
            options={'abstract': False},
        ),

        # ── 4. Add nullable image FK to ProductImage ─────────────────────────
        migrations.AddField(
            model_name='productimage',
            name='image',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='product_images',
                to='products.image',
            ),
        ),

        # ── 5. Data migration ────────────────────────────────────────────────
        migrations.RunPython(_run_forward, migrations.RunPython.noop),

        # ── 6. Make image FK non-nullable on ProductImage ────────────────────
        migrations.AlterField(
            model_name='productimage',
            name='image',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='product_images',
                to='products.image',
            ),
        ),

        # ── 7. Remove old unique constraint on ProductImage.object_key ───────
        migrations.RemoveConstraint(
            model_name='productimage',
            name='unique_product_image_object_key',
        ),

        # ── 8. Remove inline storage columns from ProductImage ───────────────
        migrations.RemoveField(model_name='productimage', name='image_url'),
        migrations.RemoveField(model_name='productimage', name='object_key'),
        migrations.RemoveField(model_name='productimage', name='alt_text'),
        migrations.RemoveField(model_name='productimage', name='content_type'),
        migrations.RemoveField(model_name='productimage', name='file_size'),
        migrations.RemoveField(model_name='productimage', name='width'),
        migrations.RemoveField(model_name='productimage', name='height'),

        # ── 9. Remove image_url from Category and Diety ──────────────────────
        migrations.RemoveField(model_name='category', name='image_url'),
        migrations.RemoveField(model_name='diety', name='image_url'),
    ]
