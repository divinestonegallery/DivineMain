from rest_framework import serializers


class PresignedUploadValidator(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    content_type = serializers.ChoiceField(choices=('image/jpeg', 'image/png', 'image/webp'))
    file_size = serializers.IntegerField(min_value=1)
    purpose = serializers.ChoiceField(
        choices=('product_image', 'customization_reference'),
        default='product_image',
    )

    def validate_filename(self, value):
        if '/' in value or '\\' in value or value.startswith('.'):
            raise serializers.ValidationError('Use a plain filename without path characters.')
        return value


class CustomerPresignedUploadValidator(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    content_type = serializers.ChoiceField(choices=('image/jpeg', 'image/png', 'image/webp'))
    file_size = serializers.IntegerField(min_value=1)

    def validate_filename(self, value):
        if '/' in value or '\\' in value or value.startswith('.'):
            raise serializers.ValidationError('Use a plain filename without path characters.')
        return value


class LogListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
