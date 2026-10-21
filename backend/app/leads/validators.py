from rest_framework import serializers

from app.leads.constants import LEAD_SOURCE_ORDER, LEAD_STATUS_ORDER, LEAD_TOUCHPOINT_ORDER, PERMISSION_CODES
from app.leads.normalization import normalize_email, normalize_phone


class LeadListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    status = serializers.ChoiceField(choices=LEAD_STATUS_ORDER, required=False)
    source = serializers.ChoiceField(choices=LEAD_SOURCE_ORDER, required=False)
    touchpoint = serializers.ChoiceField(choices=LEAD_TOUCHPOINT_ORDER, required=False)
    assignee = serializers.IntegerField(min_value=1, required=False)
    assignment = serializers.ChoiceField(choices=('unassigned',), required=False)
    search = serializers.CharField(max_length=255, required=False, allow_blank=True)
    follow_up = serializers.ChoiceField(choices=('overdue', 'upcoming'), required=False)


class LeadWriteValidator(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.RegexField(
        regex=r'^\+?[0-9][0-9\s-]{7,19}$',
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    summary = serializers.CharField(min_length=2, max_length=5000)
    follow_up_at = serializers.DateTimeField(required=False, allow_null=True)
    assigned_to = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    confirm_duplicate = serializers.BooleanField(required=False, default=False)

    def validate_email(self, value):
        return normalize_email(value)

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_name(self, value):
        return value.strip()

    def validate_city(self, value):
        return value.strip() if value else ''

    def validate_summary(self, value):
        return value.strip()

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError('Provide an email address or phone number.')
        if attrs.get('phone') and len(attrs['phone']) > 32:
            raise serializers.ValidationError('Enter a shorter phone number.')
        return attrs


class LeadUpdateValidator(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=255, required=False)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.RegexField(
        regex=r'^\+?[0-9][0-9\s-]{7,19}$',
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    summary = serializers.CharField(min_length=2, max_length=5000, required=False)
    status = serializers.ChoiceField(choices=LEAD_STATUS_ORDER, required=False)
    lost_reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    follow_up_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate_email(self, value):
        return normalize_email(value)

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_name(self, value):
        return value.strip()

    def validate_city(self, value):
        return value.strip() if value else ''

    def validate_summary(self, value):
        return value.strip()

    def validate_lost_reason(self, value):
        return value.strip() if value else ''

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide a lead change.')
        if 'assigned_to' in self.initial_data:
            raise serializers.ValidationError('Use the assignment endpoint to change the assignee.')
        if attrs.get('phone') and len(attrs['phone']) > 32:
            raise serializers.ValidationError('Enter a shorter phone number.')
        contact_fields = ('email', 'phone')
        if any(field in attrs for field in contact_fields):
            email = attrs.get('email', None)
            phone = attrs.get('phone', None)
            if email == '' and phone == '':
                raise serializers.ValidationError('Provide an email address or phone number.')
        return attrs


class LeadNoteValidator(serializers.Serializer):
    body = serializers.CharField(min_length=1, max_length=5000)

    def validate_body(self, value):
        return value.strip()


class LeadAssignmentValidator(serializers.Serializer):
    assigned_to = serializers.IntegerField(min_value=1, allow_null=True)


class ActivityListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)


class NotificationListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    unread = serializers.BooleanField(required=False)


class StaffGroupWriteValidator(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=80)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PERMISSION_CODES),
        allow_empty=True,
    )

    def validate_name(self, value):
        return value.strip()

    def validate_description(self, value):
        return value.strip() if value else ''

    def validate_permissions(self, value):
        return list(dict.fromkeys(value))


class StaffGroupUpdateValidator(StaffGroupWriteValidator):
    name = serializers.CharField(min_length=2, max_length=80, required=False)
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PERMISSION_CODES),
        allow_empty=True,
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide a group change.')
        return attrs


class MembershipValidator(serializers.Serializer):
    customer_id = serializers.IntegerField(min_value=1)
    group_id = serializers.IntegerField(min_value=1)


class MembershipListValidator(serializers.Serializer):
    group_id = serializers.IntegerField(min_value=1, required=False)
