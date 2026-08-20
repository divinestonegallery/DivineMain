from rest_framework import serializers


class ContactMessageValidator(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=255)
    email = serializers.EmailField()
    phone = serializers.RegexField(regex=r'^\+?[0-9][0-9\s-]{7,19}$', required=False, allow_blank=True, allow_null=True)
    message = serializers.CharField(min_length=10, max_length=5000)

    def validate_email(self, value):
        return value.strip().lower()


class CustomizeRequestValidator(serializers.Serializer):
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

    def validate_email(self, value):
        return value.strip().lower() if value else value

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError('Provide an email address or phone number.')
        if not attrs.get('description') and not attrs.get('approximate_height'):
            raise serializers.ValidationError('Provide a description or approximate height.')
        return attrs


class RequestListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    status = serializers.CharField(max_length=50, required=False)


class ContactStatusValidator(serializers.Serializer):
    status = serializers.ChoiceField(choices=('new', 'contacted', 'closed'))


class CustomizeStatusValidator(serializers.Serializer):
    status = serializers.ChoiceField(choices=('new', 'contacted', 'quoted', 'accepted', 'closed'))
