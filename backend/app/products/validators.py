from rest_framework import serializers
from decimal import Decimal


AVAILABILITY = ('in_stock', 'made_to_order', 'out_of_stock')


class ProductRequestValidator(serializers.Serializer):
    category = serializers.IntegerField(min_value=1, required=False)
    material = serializers.IntegerField(min_value=1, required=False)
    diety = serializers.IntegerField(min_value=1, required=False)
    deity = serializers.IntegerField(min_value=1, required=False)
    name = serializers.CharField(max_length=255, required=False)
    short_description = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    keywords = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_featured = serializers.BooleanField(required=False)
    availability = serializers.ChoiceField(choices=AVAILABILITY, required=False)
    status = serializers.ChoiceField(choices=('draft', 'active', 'archived'), required=False)
    sales_mode = serializers.ChoiceField(
        choices=('quote_only', 'buy_and_quote', 'direct_purchase'), required=False
    )
    display_order = serializers.IntegerField(min_value=0, required=False)

    def validate(self, attrs):
        if attrs.get('deity') and attrs.get('diety') and attrs['deity'] != attrs['diety']:
            raise serializers.ValidationError('deity and legacy diety values must match.')
        if attrs.get('deity'):
            attrs['diety'] = attrs.pop('deity')
        return attrs


class ProductListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=24)
    search = serializers.CharField(max_length=255, required=False, allow_blank=True)
    category = serializers.CharField(max_length=255, required=False, allow_blank=True)
    material = serializers.CharField(max_length=255, required=False, allow_blank=True)
    deity = serializers.CharField(max_length=255, required=False, allow_blank=True)
    availability = serializers.ChoiceField(choices=AVAILABILITY, required=False)
    status = serializers.ChoiceField(choices=('draft', 'active', 'archived'), required=False)
    min_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    max_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    sort = serializers.ChoiceField(
        choices=('newest', 'oldest', 'featured', 'price_asc', 'price_desc', 'display_order'),
        default='display_order',
    )

    def validate(self, attrs):
        if attrs.get('min_price') is not None and attrs.get('max_price') is not None:
            if attrs['max_price'] < attrs['min_price']:
                raise serializers.ValidationError('max_price must be greater than or equal to min_price.')
        return attrs


class ProductVariantValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    sku = serializers.RegexField(regex=r'^[A-Z0-9][A-Z0-9_-]{2,99}$', required=False)
    price_before_gst = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True)
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100, required=False, allow_null=True)
    stock_quantity = serializers.IntegerField(min_value=0, required=False)
    availability = serializers.ChoiceField(choices=AVAILABILITY, required=False)
    sculpture_height_inches = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    sculpture_width_inches = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    sculpture_depth_inches = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    min_weight_kg = serializers.DecimalField(max_digits=9, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    max_weight_kg = serializers.DecimalField(max_digits=9, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    packed_length_inches = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    packed_width_inches = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    packed_height_inches = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    display_order = serializers.IntegerField(min_value=0, required=False)

    def validate_sku(self, value):
        return value.upper()

    def validate(self, attrs):
        minimum = attrs.get('min_weight_kg')
        maximum = attrs.get('max_weight_kg')
        if minimum is not None and maximum is not None and maximum < minimum:
            raise serializers.ValidationError('max_weight_kg must be greater than or equal to min_weight_kg.')
        return attrs


class ProductImageFinalizeValidator(serializers.Serializer):
    object_key = serializers.RegexField(regex=r'^product-images/[a-f0-9]{32}\.(jpg|jpeg|png|webp)$', max_length=500)
    alt_text = serializers.CharField(max_length=255, required=False, allow_blank=True)
    display_order = serializers.IntegerField(min_value=0, required=False)
    cover_photo = serializers.BooleanField(required=False, default=False)


class ProductImageUpdateValidator(serializers.Serializer):
    alt_text = serializers.CharField(max_length=255, required=False, allow_blank=True)
    display_order = serializers.IntegerField(min_value=0, required=False)
    cover_photo = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide at least one image field.')
        return attrs


class ProductImageReorderValidator(serializers.Serializer):
    image_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), min_length=1, max_length=50
    )

    def validate_image_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Image IDs must be unique.')
        return value


class CategoryRequestValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    image_url = serializers.URLField(max_length=1024, required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(required=False)


class MaterialRequestValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    is_active = serializers.BooleanField(required=False)


class DietyRequestValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    categories = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False, allow_empty=True)
    is_active = serializers.BooleanField(required=False)

    def validate_categories(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Category IDs must be unique.')
        return value
