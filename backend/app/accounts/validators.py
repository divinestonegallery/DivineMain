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


class SignupValidator(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')

    def validate_email(self, value):
        return value.strip().lower()

    def validate_name(self, value):
        return value.strip() if value else ''

    def validate_phone(self, value):
        return value.strip() if value else ''


class LoginValidator(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(max_length=128, write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class ForgotPasswordValidator(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class ResetPasswordValidator(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, max_length=128, write_only=True)


class RefreshTokenValidator(serializers.Serializer):
    refresh_token = serializers.CharField()

