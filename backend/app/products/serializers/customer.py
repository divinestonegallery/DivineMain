from rest_framework import serializers
from app.products.models import Product, ProductImage, Category, Material, Diety

class ProductCardSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name')
    category = serializers.CharField(source='category.name', read_only=True)
    size = serializers.CharField(source='height')
    material = serializers.CharField(source='material.name', read_only=True)
    cover_photo = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['slug', 'uid', 'title', 'short_description', 'category', 'size', 'material', 'cover_photo', 'selling_price', 'original_price']

    def get_cover_photo(self, obj):
        cover = obj.images.filter(cover_photo=True).first()
        if cover:
            return cover.image_url
        return None

class ProductDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    diety = serializers.CharField(source='diety.name', read_only=True)
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_images(self, obj):
        return [{"image_url": img.image_url, "alt_text": img.alt_text, "cover_photo": img.cover_photo} for img in obj.images.all().order_by('display_order')]

class CategoryCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url']

class MaterialCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ['id', 'name', 'slug']

class DietyCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diety
        fields = ['id', 'name', 'slug']
