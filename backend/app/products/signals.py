from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.text import slugify
from app.products.models import Product, Category, Material, Diety, create_random_uid

@receiver(pre_save, sender=Product)
def pre_save_product(sender, instance, **kwargs):
    if not instance.uid:
        uid = create_random_uid()
        while sender.objects.filter(uid=uid).exists():
            uid = create_random_uid()
        instance.uid = uid
        
    if not instance.slug and instance.name:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1
        while sender.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        instance.slug = slug

@receiver(pre_save, sender=Category)
def pre_save_category(sender, instance, **kwargs):
    if not instance.slug and instance.name:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1
        while sender.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        instance.slug = slug

@receiver(pre_save, sender=Material)
def pre_save_material(sender, instance, **kwargs):
    if not instance.slug and instance.name:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1
        while sender.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        instance.slug = slug

@receiver(pre_save, sender=Diety)
def pre_save_diety(sender, instance, **kwargs):
    if not instance.slug and instance.name:
        base_slug = slugify(instance.name)
        slug = base_slug
        counter = 1
        while sender.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        instance.slug = slug
