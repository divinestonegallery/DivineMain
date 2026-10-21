import re

from rest_framework import serializers

from app.leads.constants import CONTACT_TOUCHPOINTS, TOUCHPOINT_CUSTOM


_UTM_PATTERN = re.compile(r'^[\w.\- ]{1,120}$')
_FORBIDDEN_INTAKE_FIELDS = {
    'assigned_to',
    'created_by',
    'source',
    'role',
    'status',
    'owner',
    'permissions',
    'follow_up_at',
}


def clean_utm(value):
    if value in (None, ''):
        return ''
    cleaned = str(value).strip()
    if not cleaned:
        return ''
    if not _UTM_PATTERN.match(cleaned):
        raise serializers.ValidationError('Use a short campaign label without links or line breaks.')
    return cleaned


def clean_landing_path(value):
    if value in (None, ''):
        return ''
    cleaned = str(value).strip().split('?', 1)[0].split('#', 1)[0]
    if not cleaned.startswith('/') or '://' in cleaned or '\\' in cleaned or any(char.isspace() for char in cleaned):
        raise serializers.ValidationError('Use a path on this website.')
    return cleaned[:200]


def reject_privileged_intake_fields(initial_data):
    blocked = _FORBIDDEN_INTAKE_FIELDS.intersection(getattr(initial_data, 'keys', lambda: [])())
    if blocked:
        raise serializers.ValidationError('Lead assignment and internal fields cannot be set from the website.')


class WebsiteAttributionSerializer(serializers.Serializer):
    submission_id = serializers.UUIDField(required=False, allow_null=True)
    landing_path = serializers.CharField(max_length=200, required=False, allow_blank=True)
    utm_source = serializers.CharField(max_length=120, required=False, allow_blank=True)
    utm_medium = serializers.CharField(max_length=120, required=False, allow_blank=True)
    utm_campaign = serializers.CharField(max_length=120, required=False, allow_blank=True)
    utm_term = serializers.CharField(max_length=120, required=False, allow_blank=True)
    utm_content = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_landing_path(self, value):
        return clean_landing_path(value)

    def validate_utm_source(self, value):
        return clean_utm(value)

    def validate_utm_medium(self, value):
        return clean_utm(value)

    def validate_utm_campaign(self, value):
        return clean_utm(value)

    def validate_utm_term(self, value):
        return clean_utm(value)

    def validate_utm_content(self, value):
        return clean_utm(value)

    def validate(self, attrs):
        reject_privileged_intake_fields(self.initial_data)
        return attrs


def attribution_from(data):
    submission_id = data.get('submission_id')
    return {
        'submission_key': str(submission_id) if submission_id else None,
        'landing_path': data.get('landing_path') or '',
        'utm_source': data.get('utm_source') or '',
        'utm_medium': data.get('utm_medium') or '',
        'utm_campaign': data.get('utm_campaign') or '',
        'utm_term': data.get('utm_term') or '',
        'utm_content': data.get('utm_content') or '',
    }


CONTACT_TOUCHPOINT_CHOICES = CONTACT_TOUCHPOINTS
CUSTOM_TOUCHPOINT = TOUCHPOINT_CUSTOM
