from rest_framework import serializers

from app.leads.attribution import CONTACT_TOUCHPOINT_CHOICES, CUSTOM_TOUCHPOINT, WebsiteAttributionSerializer
from app.leads.constants import TOUCHPOINT_CONTACT
from app.leads.normalization import normalize_email, normalize_phone


class ContactMessageValidator(WebsiteAttributionSerializer):
    name = serializers.CharField(min_length=2, max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.RegexField(regex=r'^\+?[0-9][0-9\s-]{7,19}$', required=False, allow_blank=True, allow_null=True)
    message = serializers.CharField(min_length=10, max_length=5000)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    touchpoint = serializers.ChoiceField(choices=CONTACT_TOUCHPOINT_CHOICES, required=False, default=TOUCHPOINT_CONTACT)

    def validate_email(self, value):
        return normalize_email(value)

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_name(self, value):
        return value.strip()

    def validate_city(self, value):
        return value.strip() if value else ''

    def validate_message(self, value):
        return value.strip()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError('Provide an email address or phone number.')
        if attrs.get('phone') and len(attrs['phone']) > 32:
            raise serializers.ValidationError('Enter a shorter phone number.')
        return attrs


class CustomizeRequestValidator(WebsiteAttributionSerializer):
    name = serializers.CharField(min_length=2, max_length=255, required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    phone = serializers.RegexField(regex=r'^\+?[0-9][0-9\s-]{7,19}$', required=False, allow_blank=True, allow_null=True)
    city = serializers.CharField(min_length=2, max_length=100)
    pincode = serializers.RegexField(regex=r'^[1-9][0-9]{5}$', required=False, allow_blank=True, allow_null=True)
    approximate_height = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    preferred_material = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(max_length=10000, required=False, allow_blank=True, allow_null=True)
    reference_object_key = serializers.RegexField(
        regex=r'^customization-references/[a-f0-9]{32}\.(jpg|jpeg|png|webp)$',
        max_length=500,
        required=False,
        allow_null=True,
    )

    touchpoint = serializers.ChoiceField(choices=(CUSTOM_TOUCHPOINT,), required=False, default=CUSTOM_TOUCHPOINT)

    def validate_email(self, value):
        return normalize_email(value)

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_name(self, value):
        return value.strip() if value else value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError('Provide an email address or phone number.')
        if attrs.get('phone') and len(attrs['phone']) > 32:
            raise serializers.ValidationError('Enter a shorter phone number.')
        if not attrs.get('description') and not attrs.get('approximate_height'):
            raise serializers.ValidationError('Provide a description or approximate height.')
        attrs['touchpoint'] = CUSTOM_TOUCHPOINT
        return attrs


class RequestListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    status = serializers.CharField(max_length=50, required=False)


class ContactStatusValidator(serializers.Serializer):
    status = serializers.ChoiceField(choices=('new', 'contacted', 'closed'))


class CustomizeStatusValidator(serializers.Serializer):
    status = serializers.ChoiceField(choices=('new', 'contacted', 'quoted', 'accepted', 'closed'))


class CustomizationUploadUrlValidator(serializers.Serializer):
    """Validates a request to generate a presigned upload URL for a customization reference image."""
    content_type = serializers.ChoiceField(choices=('image/jpeg', 'image/png', 'image/webp'))
    file_size = serializers.IntegerField(min_value=1)
    filename = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_filename(self, value):
        if value and ('/' in value or '\\' in value or value.startswith('.')):
            raise serializers.ValidationError('Use a plain filename without path characters.')
        return value

