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
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class ForgotPasswordValidator(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class ResetPasswordValidator(serializers.Serializer):
    email = serializers.EmailField(required=False)
    code = serializers.CharField(required=False, max_length=50)
    otp = serializers.CharField(required=False, max_length=50)
    verification_id = serializers.CharField(required=False, max_length=255)
    token = serializers.CharField(required=False)
    new_password = serializers.CharField(min_length=8, max_length=128, write_only=True)

    def validate_email(self, value):
        return value.strip().lower() if value else None

    def validate(self, attrs):
        token = attrs.get('token')
        code = attrs.get('code') or attrs.get('otp')
        if code:
            attrs['code'] = code
        email = attrs.get('email')

        if not token and not (email and code):
            raise serializers.ValidationError(
                'Either provide "token", or provide both "email" and "code" (or "otp").'
            )
        return attrs


class RefreshTokenValidator(serializers.Serializer):
    refresh_token = serializers.CharField()


class UpdateProfileValidator(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    email = serializers.EmailField(max_length=255, required=False)

    def validate_name(self, value):
        return value.strip() if value else ''

    def validate_phone(self, value):
        return value.strip() if value else ''

    def validate_email(self, value):
        return value.strip().lower() if value else value

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide at least one field to update.')
        return attrs

