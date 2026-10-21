import json
import logging

from django.http import JsonResponse

from app.integrations.google_ads.service import GoogleAdsLeadIntegrationService
from framework.core.base_apiviews import OpenAPIView

logger = logging.getLogger(__name__)

_MAX_BODY_BYTES = 100_000


class GoogleAdsLeadWebhookView(OpenAPIView):
    """Inbound Google Ads lead-form callback. Staff login is not required.

    The anonymous API throttle is disabled so a valid Google retry is not
    turned into a permanent 429.
    """

    throttle_classes = []

    def post(self, request):
        content_type = (request.content_type or '').split(';', 1)[0].strip().lower()
        if content_type != 'application/json':
            return _google_response(400, 'JSON body is required.')
        raw = request.body or b''
        if len(raw) > _MAX_BODY_BYTES:
            return _google_response(400, 'Webhook body is too large.')
        try:
            payload = json.loads(raw.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return _google_response(400, 'Webhook body is not valid JSON.')
        try:
            status_code, message = GoogleAdsLeadIntegrationService.ingest(payload)
        except Exception:
            logger.exception('google_ads webhook outcome=transient_failure')
            return _google_response(500, 'Temporary processing failure.')
        return _google_response(status_code, message)


def _google_response(status_code, message):
    if status_code == 200:
        return JsonResponse({}, status=200)
    return JsonResponse({'message': message}, status=status_code)
