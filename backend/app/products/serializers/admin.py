from rest_framework import serializers

from app.products.models import Category, CategoryImage, Diety, DietyImage, Image, Material, Product, ProductImage, ProductVariant


class ImageAdminSerializer(serializers.ModelSerializer):
    """Serializes the central Image record."""
    class Meta:
        model = Image
        fields = (
            'id', 'image_url', 'object_key', 'alt_text',
            'content_type', 'file_size', 'width', 'height',
            'created_at', 'updated_at',
        )


class ProductImageAdminSerializer(serializers.ModelSerializer):
    """Flattened view of ProductImage — exposes image fields at the top level
    for backward-compatibility with the admin panel."""
    image_url = serializers.CharField(source='image.image_url', read_only=True)
    object_key = serializers.CharField(source='image.object_key', read_only=True)
    alt_text = serializers.CharField(source='image.alt_text', read_only=True)
    content_type = serializers.CharField(source='image.content_type', read_only=True)
    file_size = serializers.IntegerField(source='image.file_size', read_only=True)
    width = serializers.IntegerField(source='image.width', read_only=True)
    height = serializers.IntegerField(source='image.height', read_only=True)
    image_id = serializers.IntegerField(source='image.id', read_only=True)

    class Meta:
        model = ProductImage
        fields = (
            'id', 'image_id', 'image_url', 'object_key', 'alt_text', 'display_order',
            'cover_photo', 'content_type', 'file_size', 'width', 'height',
            'created_at', 'updated_at',
        )


class ProductVariantAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = (
            'id', 'name', 'sku', 'price_before_gst', 'gst_rate',
            'stock_quantity', 'availability',
            'sculpture_height_inches', 'sculpture_width_inches', 'sculpture_depth_inches',
            'min_weight_kg', 'max_weight_kg',
            'packed_length_inches', 'packed_width_inches', 'packed_height_inches',
            'is_active', 'display_order', 'created_at', 'updated_at',
        )


class ProductAdminSerializer(serializers.ModelSerializer):
    images = ProductImageAdminSerializer(many=True, read_only=True)
    variants = ProductVariantAdminSerializer(many=True, read_only=True)
    deity = serializers.IntegerField(source='diety_id', read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = (
            'id', 'category', 'material', 'deity', 'name', 'slug', 'uid',
            'short_description', 'description', 'keywords',
            'height', 'min_weight', 'max_weight',
            'original_price', 'selling_price', 'discount_percentage', 'gst',
            'is_featured', 'availability', 'status', 'sales_mode',
            'display_order', 'home_page_display_order',
            'images', 'variants', 'created_at', 'updated_at',
        )


class ProductAdminListSerializer(ProductAdminSerializer):
    """Admin catalogue rows. Variants stay on the detail response."""

    class Meta(ProductAdminSerializer.Meta):
        fields = tuple(
            field for field in ProductAdminSerializer.Meta.fields if field != 'variants'
        )


class CategoryImageAdminSerializer(serializers.ModelSerializer):
    image = ImageAdminSerializer(read_only=True)

    class Meta:
        model = CategoryImage
        fields = ('id', 'image', 'created_at', 'updated_at')


class CategoryAdminSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'is_active', 'image', 'created_at', 'updated_at')

    def get_image(self, obj):
        try:
            ci = obj.category_image
            return ImageAdminSerializer(ci.image).data
        except CategoryImage.DoesNotExist:
            return None


class MaterialAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'


class DietyImageAdminSerializer(serializers.ModelSerializer):
    image = ImageAdminSerializer(read_only=True)

    class Meta:
        model = DietyImage
        fields = ('id', 'image', 'created_at', 'updated_at')


class DietyAdminSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Diety
        fields = (
            'id', 'name', 'slug', 'image', 'categories',
            'is_active', 'display_order', 'created_at', 'updated_at',
        )

    def get_image(self, obj):
        try:
            di = obj.diety_image
            return ImageAdminSerializer(di.image).data
        except DietyImage.DoesNotExist:
            return None
