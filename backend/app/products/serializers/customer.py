from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from app.products.models import Category, CategoryImage, Diety, DietyImage, Material, Product, ProductImage


def _build_price(obj):
    """
    Build a structured price dict from a Product instance.

    - original_price     : MRP stored on the product
    - selling_price      : discounted price stored on the product
    - discount_percentage: stored on the product (computed at seed time)
    - gst_price          : GST rupee amount = selling_price - price_before_gst
                           sourced from the first active variant
    """

    gst_price = None
    if hasattr(obj, '_variant_price_before_gst'):
        price_before_gst = obj._variant_price_before_gst
    else:
        prefetched_variants = getattr(obj, '_prefetched_objects_cache', {}).get('variants')
        if prefetched_variants is None:
            variant = obj.variants.filter(is_active=True).first()
        else:
            variant = next((item for item in prefetched_variants if item.is_active), None)
        price_before_gst = variant.price_before_gst if variant else None
    if price_before_gst and obj.selling_price:
        gst_price = (obj.selling_price - price_before_gst).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    return {
        'original_price': obj.original_price,
        'selling_price': obj.selling_price,
        'discount_percentage': obj.discount_percentage,
        'gst_price': gst_price,
    }


class ProductImageCustomerSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(source='image.image_url', read_only=True)
    alt_text = serializers.CharField(source='image.alt_text', read_only=True)
    width = serializers.IntegerField(source='image.width', read_only=True)
    height = serializers.IntegerField(source='image.height', read_only=True)

    class Meta:
        model = ProductImage
        fields = ('image_url', 'alt_text', 'display_order', 'cover_photo', 'width', 'height')


class ProductCardSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name')
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True, allow_null=True, default=None)
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
        if hasattr(obj, '_cover_photo_url'):
            return obj._cover_photo_url
        cover = next((pi for pi in obj.images.all() if pi.cover_photo), None)
        return cover.image.image_url if cover else None

    def get_availability(self, obj):
        return obj.availability

    def get_price(self, obj):
        return _build_price(obj)


class ProductDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    material = serializers.CharField(source='material.name', read_only=True)
    deity = serializers.CharField(source='diety.name', read_only=True, allow_null=True, default=None)
    images = ProductImageCustomerSerializer(many=True, read_only=True)
    availability = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    keywords = serializers.ListField(child=serializers.CharField(), read_only=True)

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
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'image_url')

    def get_image_url(self, obj):
        try:
            return obj.category_image.image.image_url
        except (CategoryImage.DoesNotExist, AttributeError):
            return None


class MaterialCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ('id', 'name', 'slug')


class DietyCustomerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Diety
        fields = ('id', 'name', 'slug', 'image_url')

    def get_image_url(self, obj):
        try:
            return obj.diety_image.image.image_url
        except (DietyImage.DoesNotExist, AttributeError):
            return None
