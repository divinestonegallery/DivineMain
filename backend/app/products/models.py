from django.db import models
from app.common.models import BaseModel
import string
import random

AVAILABILITY_CHOICES = [
    ('in_stock', 'In Stock'),
    ('made_to_order', 'Made to Order'),
    ('out_of_stock', 'Out of Stock')
]

def create_random_uid(size=8, chars=string.digits + string.ascii_uppercase):
    return ''.join(random.choice(chars) for _ in range(size))

class Category(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=16, unique=True)
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=1024, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    def __str__(self):
        return self.name

class Material(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=16, unique=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class Diety(BaseModel):
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=16, unique=True)
    categories = models.ManyToManyField(Category, related_name='dieties', blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class Product(BaseModel):
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

    def __str__(self):
        return self.name

class ProductImage(BaseModel):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image_url = models.URLField(max_length=1024, blank=True, null=True) # Used if storing direct R2 URL
    object_key = models.CharField(max_length=500, blank=True, null=True) # Used if storing R2 object key
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.IntegerField(default=0)
    cover_photo = models.BooleanField(default=False)

    def __str__(self):
        return f"Image for {self.product.name}"