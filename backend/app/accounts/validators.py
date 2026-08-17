from rest_framework import serializers


class StaffListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    search = serializers.CharField(max_length=255, required=False, allow_blank=True)


class StaffInviteValidator(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=('staff', 'admin'), default='staff')

    def validate_email(self, value):
        return value.strip().lower()


class StaffUpdateValidator(serializers.Serializer):
    role = serializers.ChoiceField(choices=('staff', 'admin'), required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide role or is_active.')
        return attrs
