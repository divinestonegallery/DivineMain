from datetime import datetime

from django.utils.dateparse import parse_datetime

from app.leads.normalization import normalize_email, normalize_phone


_COLUMN_LIMIT = 500
_ID_LIMIT = 32
_INTEREST_COLUMNS = ('PRODUCT', 'SERVICE', 'OFFER', 'CATEGORY')
_EMAIL_COLUMNS = ('EMAIL', 'WORK_EMAIL')
_PHONE_COLUMNS = ('PHONE_NUMBER', 'WORK_PHONE')


class GoogleAdsPayloadError(Exception):
    def __init__(self, message):
        self.message = message


def parse_lead_form(payload):
    """Map a Google Ads lead-form webhook body to internal fields.

    Unknown optional fields are ignored. This function does not check google_key.
    """
    if not isinstance(payload, dict):
        raise GoogleAdsPayloadError('Webhook body must be a JSON object.')
    lead_id = _required_token(payload.get('lead_id'), 'lead_id')
    google_key = payload.get('google_key')
    if not isinstance(google_key, str) or not google_key.strip():
        raise GoogleAdsPayloadError('google_key is required.')
    is_test = payload.get('is_test', False)
    if not isinstance(is_test, bool):
        raise GoogleAdsPayloadError('is_test must be a boolean when it is sent.')
    columns = _columns(payload.get('user_column_data', []))
    email = _first_contact(columns, _EMAIL_COLUMNS, normalize_email, _usable_email)
    phone = _first_contact(columns, _PHONE_COLUMNS, normalize_phone, _usable_phone)
    return {
        'lead_id': lead_id,
        'google_key': google_key,
        'is_test': is_test,
        'email': email,
        'phone': phone,
        'name': _name(columns),
        'city': _text(columns.get('CITY'))[:100],
        'summary': _summary(columns),
        'form_id': _optional_id(payload.get('form_id')),
        'campaign_id': _optional_id(payload.get('campaign_id')),
        'adgroup_id': _optional_id(payload.get('adgroup_id')),
        'creative_id': _optional_id(payload.get('creative_id')),
        'asset_group_id': _optional_id(payload.get('asset_group_id')),
        'gcl_id': _optional_text(payload.get('gcl_id'), 255),
        'lead_stage': _optional_text(payload.get('lead_stage'), 80),
        'form_origin': _optional_text(payload.get('lead_source'), 80),
        'submitted_at': _optional_time(payload.get('lead_submit_time')),
    }


def _required_token(value, field_name):
    if not isinstance(value, str):
        raise GoogleAdsPayloadError(f'{field_name} is required.')
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 255 or any(character.isspace() for character in cleaned):
        raise GoogleAdsPayloadError(f'{field_name} is required.')
    return cleaned


def _columns(value):
    if value is None:
        return {}
    if not isinstance(value, list):
        raise GoogleAdsPayloadError('user_column_data must be a list.')
    parsed = {}
    for item in value:
        if not isinstance(item, dict):
            continue
        column_id = item.get('column_id')
        string_value = item.get('string_value')
        if not isinstance(column_id, str) or not isinstance(string_value, str):
            continue
        parsed[column_id.strip().upper()[:80]] = string_value.strip()[:_COLUMN_LIMIT]
    return parsed


def _first_contact(columns, names, normalizer, usable):
    for name in names:
        raw = columns.get(name)
        if not raw:
            continue
        normalized = normalizer(raw)
        if usable(normalized):
            return normalized
    return ''


def _usable_email(value):
    return bool(value) and '@' in value and len(value) <= 254


def _usable_phone(value):
    digits = ''.join(character for character in value if character.isdigit())
    return 8 <= len(digits) <= 15 and len(value) <= 32


def _name(columns):
    full_name = _text(columns.get('FULL_NAME'))
    if len(full_name) >= 2:
        return full_name[:255]
    combined = ' '.join(
        part for part in (_text(columns.get('FIRST_NAME')), _text(columns.get('LAST_NAME'))) if part
    ).strip()
    if len(combined) >= 2:
        return combined[:255]
    return 'Google Ads lead'


def _summary(columns):
    interests = [_text(columns.get(name)) for name in _INTEREST_COLUMNS]
    interests = [item for item in interests if item]
    if not interests:
        return 'Google Ads lead form submission.'
    return ('Google Ads lead form: ' + '; '.join(interests))[:5000]


def _text(value):
    return value.strip() if isinstance(value, str) else ''


def _optional_text(value, limit):
    if value is None:
        return ''
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        return ''
    cleaned = str(value).strip()
    if not cleaned or any(character.isspace() for character in cleaned):
        return ''
    return cleaned[:limit]


def _optional_id(value):
    if value is None or isinstance(value, bool):
        return ''
    if isinstance(value, int):
        return str(value)[:_ID_LIMIT]
    if isinstance(value, str) and value.strip().isdigit():
        return value.strip()[:_ID_LIMIT]
    return ''


def _optional_time(value):
    if not isinstance(value, str) or not value.strip():
        return None
    parsed = parse_datetime(value.strip().replace('Z', '+00:00'))
    if isinstance(parsed, datetime):
        return parsed
    return None
