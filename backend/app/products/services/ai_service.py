import base64
import json

import requests
from django.conf import settings

from app.products.models import Category, Diety, Material


DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'


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
        except (ValueError, TypeError):
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


def generate_product_draft(payload):
    api_key = getattr(settings, 'GEMINI_API_KEY', '').strip()
    if not api_key:
        return 'AI product generation is not configured on the server. Set GEMINI_API_KEY and restart the backend.', None

    model = (getattr(settings, 'GEMINI_MODEL', '') or DEFAULT_GEMINI_MODEL).strip().removeprefix('models/') or DEFAULT_GEMINI_MODEL

    selected_classification = []
    for label, model_class, payload_key in (
        ('deity', Diety, 'deity_id'),
        ('category', Category, 'category_id'),
        ('material', Material, 'material_id'),
    ):
        identifier = payload.get(payload_key)
        if identifier is not None:
            name = model_class.objects.filter(pk=identifier).values_list('name', flat=True).first()
            if name:
                selected_classification.append(f'{label}: {name}')

    prompt = (
        'Create concise, factual catalogue copy for a handcrafted Indian stone deity product. '
        'Return JSON only with these keys: short_description (max 500 chars), description, '
        'keywords (array of 3-8 short strings), availability (one of in_stock, made_to_order, out_of_stock), '
        'sales_mode (one of quote_only, buy_and_quote, direct_purchase), height, min_weight, max_weight. '
        'Do not invent exact measurements; use empty strings when the image does not support them. '
        f"The admin selected the product name: {payload['name']}. "
        f"Selected classification: {', '.join(selected_classification) or 'not specified'}."
    )
    image_data = payload['image_base64'].split(',', 1)[-1]
    if not image_data:
        return 'Product image data is invalid. Please upload the image again.', None
    try:
        base64.b64decode(image_data, validate=True)
    except ValueError:
        return 'Product image data is invalid. Please upload the image again.', None

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={'x-goog-api-key': api_key, 'Content-Type': 'application/json'},
            json={
                'contents': [{'parts': [
                    {'text': prompt},
                    {'inline_data': {'mime_type': payload['image_mime_type'], 'data': image_data}},
                ]}],
                'generationConfig': {'responseMimeType': 'application/json'},
            },
            timeout=45,
        )
        response.raise_for_status()
        parts = response.json().get('candidates', [{}])[0].get('content', {}).get('parts', [])
        generated = json.loads(''.join(part.get('text', '') for part in parts))
    except requests.HTTPError as exc:
        return _gemini_error_message(exc.response), None
    except requests.RequestException:
        return 'Could not reach Gemini API. Please try again.', None
    except (ValueError, IndexError, TypeError, KeyError):
        return 'Gemini returned an invalid response. Please try again.', None

    availability = generated.get('availability')
    sales_mode = generated.get('sales_mode')
    keywords = generated.get('keywords', [])
    if not isinstance(keywords, list):
        keywords = []

    return None, {
        'name': payload['name'],
        'category': payload['category_id'],
        'material': payload['material_id'],
        'deity': payload.get('deity_id'),
        'short_description': str(generated.get('short_description', ''))[:500],
        'description': str(generated.get('description', '')),
        'keywords': [str(keyword)[:100] for keyword in keywords if str(keyword).strip()][:8],
        'availability': availability if availability in {'in_stock', 'made_to_order', 'out_of_stock'} else 'made_to_order',
        'sales_mode': sales_mode if sales_mode in {'quote_only', 'buy_and_quote', 'direct_purchase'} else 'quote_only',
        'height': str(generated.get('height', '')),
        'min_weight': str(generated.get('min_weight', '')),
        'max_weight': str(generated.get('max_weight', '')),
        'status': 'draft',
        'display_order': 999,
        'home_page_display_order': 999,
        'is_featured': False,
    }
