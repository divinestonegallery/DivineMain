import secrets
import string

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models.functions import Lower

from app.common.models import BaseModel

AVAILABILITY_CHOICES = [
    ('in_stock', 'In Stock'),
    ('made_to_order', 'Made to Order'),
    ('out_of_stock', 'Out of Stock')
]

def create_random_uid(size=8, chars=string.digits + string.ascii_uppercase):
    return ''.join(secrets.choice(chars) for _ in range(size))

class Category(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=1024, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(Lower('name'), name='unique_category_name_ci')]
    def __str__(self):
        return self.name

class Material(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(Lower('name'), name='unique_material_name_ci')]
    
    def __str__(self):
        return self.name

class Diety(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    categories = models.ManyToManyField(Category, related_name='dieties', blank=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        verbose_name = 'Deity'
        verbose_name_plural = 'Deities'
        constraints = [models.UniqueConstraint(Lower('name'), name='unique_deity_name_ci')]
    
    def __str__(self):
        return self.name

class Product(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ARCHIVED = 'archived', 'Archived'

    class SalesMode(models.TextChoices):
        QUOTE_ONLY = 'quote_only', 'Quote only'
        BUY_AND_QUOTE = 'buy_and_quote', 'Buy and quote'
        DIRECT_PURCHASE = 'direct_purchase', 'Direct purchase'

    category = models.ForeignKey(Category, related_name='products', on_delete=models.PROTECT, null=False, blank=False)
    material = models.ForeignKey(Material, related_name='products', on_delete=models.PROTECT, null=False, blank=False)
    diety = models.ForeignKey(Diety, related_name='products', on_delete=models.PROTECT, null=False, blank=False)
    name = models.CharField(max_length=255, blank=False, null=False)
    slug = models.CharField(max_length=255, unique=True, blank=True, null=True)
    uid = models.CharField(max_length=255, unique=True, blank=True, null=True)
    short_description = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    keywords = models.TextField(blank=True, null=True)
    height = models.CharField(max_length=100, blank=True, null=True)
    min_weight = models.CharField(max_length=100, blank=True, null=True)
    max_weight = models.CharField(max_length=100, blank=True, null=True) 
    original_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    discount_percentage = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    gst = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    availability = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default='in_stock') 
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    sales_mode = models.CharField(max_length=30, choices=SalesMode.choices, default=SalesMode.QUOTE_ONLY)
    display_order = models.PositiveIntegerField(default=999, db_index=True)

    def __str__(self):
        return self.name

class ProductImage(BaseModel):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image_url = models.URLField(max_length=1024, blank=True, null=True) # Used if storing direct R2 URL
    object_key = models.CharField(max_length=500, blank=True, null=True) # Used if storing R2 object key
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.IntegerField(default=0)
    cover_photo = models.BooleanField(default=False)
    content_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(blank=True, null=True)
    width = models.PositiveIntegerField(blank=True, null=True)
    height = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ('display_order', 'id')
        constraints = [
            models.CheckConstraint(
                check=models.Q(display_order__gte=0),
                name='product_image_display_order_nonnegative',
            ),
            models.UniqueConstraint(
                fields=('product',),
                condition=models.Q(cover_photo=True),
                name='one_cover_image_per_product',
            ),
            models.UniqueConstraint(
                fields=('object_key',),
                condition=models.Q(object_key__isnull=False),
                name='unique_product_image_object_key',
            ),
        ]

    def __str__(self):
        return f"Image for {self.product.name}"


class ProductVariant(BaseModel):
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True)
    price_before_gst = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    gst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    availability = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default='in_stock')
    sculpture_height_inches = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    sculpture_width_inches = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    sculpture_depth_inches = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    min_weight_kg = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    max_weight_kg = models.DecimalField(max_digits=9, decimal_places=2, blank=True, null=True)
    packed_length_inches = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    packed_width_inches = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    packed_height_inches = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('display_order', 'id')
        constraints = [
            models.UniqueConstraint(Lower('sku'), name='unique_product_variant_sku_ci'),
            models.UniqueConstraint(
                Lower('name'),
                'product',
                name='unique_product_variant_name_ci',
            ),
            models.CheckConstraint(
                check=models.Q(price_before_gst__gte=0) | models.Q(price_before_gst__isnull=True),
                name='variant_price_nonnegative',
            ),
            models.CheckConstraint(
                check=models.Q(max_weight_kg__gte=models.F('min_weight_kg'))
                | models.Q(max_weight_kg__isnull=True)
                | models.Q(min_weight_kg__isnull=True),
                name='variant_weight_range_valid',
            ),
            models.CheckConstraint(
                check=models.Q(gst_rate__range=(0, 100)) | models.Q(gst_rate__isnull=True),
                name='variant_gst_rate_valid',
            ),
            *[
                models.CheckConstraint(
                    check=models.Q(**{f'{field}__gt': 0}) | models.Q(**{f'{field}__isnull': True}),
                    name=f'variant_{field}_positive',
                )
                for field in (
                    'sculpture_height_inches', 'sculpture_width_inches',
                    'sculpture_depth_inches', 'min_weight_kg', 'max_weight_kg',
                    'packed_length_inches', 'packed_width_inches', 'packed_height_inches',
                )
            ],
        ]

    def __str__(self):
        return f"{self.product.name} — {self.name}"
