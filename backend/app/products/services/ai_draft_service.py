import base64
import binascii
import json

import requests
from django.conf import settings

from app.products.models import Category, Diety, Material


DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
INVALID_IMAGE_MESSAGE = 'Product image data is invalid. Please upload the image again.'
INVALID_RESPONSE_MESSAGE = 'Gemini returned an invalid response. Please try again.'
AVAILABILITY_VALUES = {'in_stock', 'made_to_order', 'out_of_stock'}
SALES_MODE_VALUES = {'quote_only', 'buy_and_quote', 'direct_purchase'}
IMAGE_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}


def _gemini_error_message(response):
    status_code = response.status_code if response is not None else None
    if status_code in {401, 403}:
        return 'Gemini authentication failed. Check the server API key and API access.'
    if status_code == 429:
        return 'Gemini rate limit reached. Please wait a moment and try again.'
    if status_code in {502, 503, 504}:
        return 'Gemini is temporarily unavailable or experiencing high demand. Please wait a moment and try again.'
    if status_code == 404:
        return 'Gemini model is unavailable or not enabled for this API key. Please check the configured Gemini model/API access.'
    if status_code == 400:
        try:
            provider_error = response.json().get('error', {})
            if not isinstance(provider_error, dict):
                provider_error = {}
        except (ValueError, TypeError, AttributeError):
            provider_error = {}
        provider_message = str(provider_error.get('message', '')).lower()
        provider_status = str(provider_error.get('status', '')).upper()
        if provider_status in {'UNAUTHENTICATED', 'PERMISSION_DENIED'} or any(
            phrase in provider_message
            for phrase in ('api key not valid', 'invalid api key', 'api key is invalid')
        ):
            return 'Gemini authentication failed. Check the server API key and API access.'
        return 'Gemini rejected the request. Check the image and product information, then try again.'
    return 'Gemini API request failed. Please try again.'


def _safe_text(value):
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    return ''


def _image_data(payload):
    image_data = (payload.get('image_base64') or '').strip()
    mime_type = (payload.get('image_mime_type') or '').strip().lower()
    if mime_type not in IMAGE_MIME_TYPES:
        return 'Unsupported product image format. Please upload a JPEG, PNG, or WEBP image.', None, None

    if image_data.startswith('data:'):
        header, separator, encoded_data = image_data.partition(',')
        declared_type = header[5:].removesuffix(';base64')
        if not separator or not header.endswith(';base64') or declared_type.lower() != mime_type:
            return INVALID_IMAGE_MESSAGE, None, None
        image_data = encoded_data

    if not image_data:
        return INVALID_IMAGE_MESSAGE, None, None
    try:
        image_bytes = base64.b64decode(image_data, validate=True)
    except (binascii.Error, ValueError):
        return INVALID_IMAGE_MESSAGE, None, None
    if not image_bytes:
        return INVALID_IMAGE_MESSAGE, None, None
    return None, image_data, mime_type


def _selected_classification(payload):
    selected = []
    for label, model_class, payload_key, required in (
        ('deity', Diety, 'deity_id', False),
        ('category', Category, 'category_id', True),
        ('material', Material, 'material_id', True),
    ):
        identifier = payload.get(payload_key)
        if identifier is None:
            if required:
                return f'A valid {label} is required.', None
            continue
        name = model_class.objects.filter(pk=identifier).values_list('name', flat=True).first()
        if not name:
            return f'The selected {label} is invalid. Please choose a valid classification.', None
        selected.append(f'{label}: {name}')
    return None, selected


def _parse_generated_content(response_data):
    if not isinstance(response_data, dict):
        return None
    candidates = response_data.get('candidates')
    if not isinstance(candidates, list) or not candidates or not isinstance(candidates[0], dict):
        return None
    content = candidates[0].get('content')
    if not isinstance(content, dict):
        return None
    parts = content.get('parts')
    if not isinstance(parts, list):
        return None
    text_parts = [part.get('text', '') for part in parts if isinstance(part, dict) and isinstance(part.get('text'), str)]
    generated_text = ''.join(text_parts).strip()
    if not generated_text:
        return None
    try:
        generated = json.loads(generated_text)
    except (json.JSONDecodeError, TypeError):
        return None
    return generated if isinstance(generated, dict) else None


def generate_product_draft(payload):
    api_key = getattr(settings, 'GEMINI_API_KEY', '').strip()
    if not api_key:
        return 'AI product generation is not configured on the server. Set GEMINI_API_KEY and restart the backend.', None

    configured_model = getattr(settings, 'GEMINI_MODEL', '').strip()
    model = configured_model or DEFAULT_GEMINI_MODEL
    while model.startswith('models/'):
        model = model[len('models/'):]
    if not model:
        return 'The configured Gemini model is invalid. Please check GEMINI_MODEL.', None

    if not (payload.get('name') or '').strip():
        return 'Product name is required.', None
    error, classification = _selected_classification(payload)
    if error:
        return error, None
    error, image_data, mime_type = _image_data(payload)
    if error:
        return error, None

    prompt = (
        'Create concise, factual catalogue copy for the supplied product image. Return JSON only with exactly '
        'these keys: short_description, description, keywords, availability, sales_mode, height, min_weight, max_weight. '
        'short_description must be at most 500 characters and suitable for a product listing or detail page. '
        'Description must be factual. Do not invent historical, religious, manufacturing, material, product, '
        'dimension, weight, age, origin, authenticity, certification, or craftsmanship claims that are not supported '
        'by the image or supplied information. Return at most 8 short, relevant keywords as an array of strings. '
        'availability must be in_stock, made_to_order, or out_of_stock; when the image cannot establish availability, '
        'use made_to_order. sales_mode must be quote_only, buy_and_quote, or direct_purchase; when uncertain, use '
        'quote_only. Never invent exact measurements or weights. Use an empty string when the image or supplied product '
        'information does not support the value. Return height, min_weight, and max_weight as strings. '
        f"Product name: {payload['name'].strip()}. "
        f"Selected classification: {', '.join(classification) or 'not specified'}."
    )

    try:
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            headers={'x-goog-api-key': api_key, 'Content-Type': 'application/json'},
            json={
                'contents': [{'parts': [
                    {'text': prompt},
                    {'inline_data': {'mime_type': mime_type, 'data': image_data}},
                ]}],
                'generationConfig': {'responseMimeType': 'application/json'},
            },
            timeout=45,
        )
        response.raise_for_status()
        generated = _parse_generated_content(response.json())
    except requests.HTTPError as exc:
        return _gemini_error_message(exc.response), None
    except requests.exceptions.JSONDecodeError:
        return INVALID_RESPONSE_MESSAGE, None
    except requests.RequestException:
        return 'Could not reach Gemini API. Please try again.', None
    except (ValueError, TypeError, AttributeError):
        return INVALID_RESPONSE_MESSAGE, None
    if generated is None:
        return INVALID_RESPONSE_MESSAGE, None

    availability = generated.get('availability')
    sales_mode = generated.get('sales_mode')
    keywords = generated.get('keywords', [])
    if not isinstance(keywords, list):
        keywords = []

    return None, {
        'name': payload['name'].strip(),
        'category': payload['category_id'],
        'material': payload['material_id'],
        'deity': payload.get('deity_id'),
        'short_description': _safe_text(generated.get('short_description'))[:500],
        'description': _safe_text(generated.get('description')),
        'keywords': [_safe_text(keyword)[:100] for keyword in keywords if _safe_text(keyword).strip()][:8],
        'availability': availability if isinstance(availability, str) and availability in AVAILABILITY_VALUES else 'made_to_order',
        'sales_mode': sales_mode if isinstance(sales_mode, str) and sales_mode in SALES_MODE_VALUES else 'quote_only',
        'height': _safe_text(generated.get('height')),
        'min_weight': _safe_text(generated.get('min_weight')),
        'max_weight': _safe_text(generated.get('max_weight')),
        'status': 'draft',
        'display_order': 999,
        'home_page_display_order': 999,
        'is_featured': False,
    }