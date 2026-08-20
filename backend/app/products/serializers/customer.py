from rest_framework import serializers

from app.products.models import Category, Diety, Material, Product, ProductImage, ProductVariant


class ProductImageCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('image_url', 'alt_text', 'display_order', 'cover_photo', 'width', 'height')


class ProductVariantCustomerSerializer(serializers.ModelSerializer):
    price_with_gst = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        exclude = ('created_at', 'updated_at', 'product')

    def get_price_with_gst(self, obj):
        if obj.price_before_gst is None or obj.gst_rate is None:
            return None
        return str((obj.price_before_gst * (1 + obj.gst_rate / 100)).quantize(obj.price_before_gst))


class ProductCardSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name')
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True)
    cover_photo = serializers.SerializerMethodField()
    starting_price = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'slug', 'uid', 'title', 'short_description', 'category', 'material',
            'deity', 'cover_photo', 'starting_price', 'sales_mode', 'availability',
            'is_featured',
        )

    def get_cover_photo(self, obj):
        cover = next((image for image in obj.images.all() if image.cover_photo), None)
        return cover.image_url if cover else None

    def get_starting_price(self, obj):
        prices = [variant.price_before_gst for variant in obj.variants.all() if variant.is_active and variant.price_before_gst is not None]
        return str(min(prices)) if prices else None

    def get_availability(self, obj):
        return _public_availability(obj)


class ProductDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True)
    images = ProductImageCustomerSerializer(many=True, read_only=True)
    variants = ProductVariantCustomerSerializer(many=True, read_only=True)
    availability = serializers.SerializerMethodField()

    class Meta:
        model = Product
        exclude = (
            'is_active', 'original_price', 'selling_price', 'discount_percentage',
            'gst', 'height', 'min_weight', 'max_weight', 'diety',
        )

    def get_availability(self, obj):
        return _public_availability(obj)


def _public_availability(product):
    variants = [variant for variant in product.variants.all() if variant.is_active]
    if not variants:
        return product.availability
    if any(variant.availability == 'in_stock' and variant.stock_quantity > 0 for variant in variants):
        return 'in_stock'
    if any(variant.availability == 'made_to_order' for variant in variants):
        return 'made_to_order'
    return 'out_of_stock'


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
