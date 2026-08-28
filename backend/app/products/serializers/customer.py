from rest_framework import serializers

from app.products.models import Category, Diety, Material, Product, ProductImage


class ProductImageCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('image_url', 'alt_text', 'display_order', 'cover_photo', 'width', 'height')


class ProductCardSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name')
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True)
    cover_photo = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'slug', 'uid', 'title', 'short_description', 'category', 'material',
            'deity', 'cover_photo', 'sales_mode', 'availability',
            'is_featured',
        )

    def get_cover_photo(self, obj):
        cover = next((image for image in obj.images.all() if image.cover_photo), None)
        return cover.image_url if cover else None

    def get_availability(self, obj):
        return obj.availability


class ProductDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True)
    images = ProductImageCustomerSerializer(many=True, read_only=True)
    availability = serializers.SerializerMethodField()

    class Meta:
        model = Product
        exclude = (
            'is_active', 'original_price', 'selling_price', 'discount_percentage',
            'gst', 'height', 'min_weight', 'max_weight', 'diety',
        )

    def get_availability(self, obj):
        return obj.availability


class CategoryCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'image_url')


class MaterialCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ('id', 'name', 'slug')


class DietyCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diety
        fields = ('id', 'name', 'slug')
