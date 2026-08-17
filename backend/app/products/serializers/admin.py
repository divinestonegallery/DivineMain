from rest_framework import serializers

from app.products.models import Category, Diety, Material, Product, ProductImage, ProductVariant


class ProductImageAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = (
            'id', 'image_url', 'object_key', 'alt_text', 'display_order',
            'cover_photo', 'content_type', 'file_size', 'width', 'height',
            'created_at', 'updated_at',
        )


class ProductVariantAdminSerializer(serializers.ModelSerializer):
    price_with_gst = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = '__all__'

    def get_price_with_gst(self, obj):
        if obj.price_before_gst is None or obj.gst_rate is None:
            return None
        return str((obj.price_before_gst * (1 + obj.gst_rate / 100)).quantize(obj.price_before_gst))


class ProductAdminSerializer(serializers.ModelSerializer):
    images = ProductImageAdminSerializer(many=True, read_only=True)
    variants = ProductVariantAdminSerializer(many=True, read_only=True)
    deity = serializers.IntegerField(source='diety_id', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'category', 'material', 'deity', 'name', 'slug', 'uid',
            'short_description', 'description', 'keywords', 'is_featured',
            'availability', 'status', 'sales_mode', 'display_order',
            'images', 'variants', 'created_at', 'updated_at',
        )


class CategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class MaterialAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'


class DietyAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diety
        fields = '__all__'
