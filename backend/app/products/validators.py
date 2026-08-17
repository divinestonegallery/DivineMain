from rest_framework import serializers

class CategoryRequestValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    image_url = serializers.URLField(max_length=1024, required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)

class MaterialRequestValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    is_active = serializers.BooleanField(required=False, default=True)

class DietyRequestValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    categories = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    is_active = serializers.BooleanField(required=False, default=True)
