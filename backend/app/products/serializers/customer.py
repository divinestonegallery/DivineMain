from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from app.products.models import Category, Diety, Material, Product, ProductImage


def _build_price(obj):
    """
    Build a structured price dict from a Product instance.

    - original_price     : MRP stored on the product
    - selling_price      : discounted price stored on the product
    - discount_percentage: stored on the product (computed at seed time)
    - gst_price          : GST rupee amount = selling_price - price_before_gst
                           sourced from the first active variant
    """
    original  = obj.original_price
    selling   = obj.selling_price
    discount  = obj.discount_percentage

    gst_price = None
    variant = obj.variants.filter(is_active=True).first()
    if variant and variant.price_before_gst and selling:
        gst_price = (selling - variant.price_before_gst).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    return {
        'original_price':      original,
        'selling_price':       selling,
        'discount_percentage': discount,
        'gst_price':           gst_price,
    }


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
    price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'slug', 'uid', 'title', 'short_description', 'category', 'material',
            'deity', 'cover_photo', 'sales_mode', 'availability',
            'is_featured', 'price',
        )

    def get_cover_photo(self, obj):
        cover = next((image for image in obj.images.all() if image.cover_photo), None)
        return cover.image_url if cover else None

    def get_availability(self, obj):
        return obj.availability

    def get_price(self, obj):
        return _build_price(obj)


class ProductDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True)
    images = ProductImageCustomerSerializer(many=True, read_only=True)
    availability = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        exclude = (
            'is_active', 'original_price', 'selling_price', 'discount_percentage',
            'gst', 'height', 'min_weight', 'max_weight', 'diety',
        )

    def get_availability(self, obj):
        return obj.availability

    def get_price(self, obj):
        return _build_price(obj)


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

