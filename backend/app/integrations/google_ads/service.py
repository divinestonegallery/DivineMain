import hmac
import logging

from django.conf import settings
from django.db import IntegrityError, transaction

from app.integrations.google_ads.client import GoogleAdsPayloadError, parse_lead_form
from app.integrations.google_ads.repository import GoogleAdsIngestionRepository
from app.leads.constants import LEAD_SOURCE_GOOGLE_ADS, TOUCHPOINT_LEAD_FORM
from app.leads.services.lead_service import LeadService

logger = logging.getLogger(__name__)


class GoogleAdsLeadIntegrationService:
    @staticmethod
    def ingest(payload):
        configured_key = settings.GOOGLE_ADS_LEAD_WEBHOOK_KEY
        if not configured_key:
            logger.error('google_ads webhook outcome=not_configured')
            return 500, 'Webhook is not configured.'
        try:
            lead = parse_lead_form(payload)
        except GoogleAdsPayloadError as exc:
            logger.warning('google_ads webhook outcome=invalid_request')
            return 400, exc.message
        if not hmac.compare_digest(configured_key, lead['google_key']):
            logger.warning('google_ads webhook outcome=invalid_key lead_id=%s', lead['lead_id'])
            return 401, 'Invalid webhook key.'
        if lead['is_test']:
            return _record_test(lead)
        return _record_production(lead)


def _record_test(lead):
    event_id = f"test:{lead['lead_id']}"
    try:
        with transaction.atomic():
            GoogleAdsIngestionRepository.mark_processed(event_id, 'test')
    except IntegrityError:
        logger.info('google_ads webhook outcome=duplicate_test lead_id=%s', lead['lead_id'])
        return 200, ''
    logger.info('google_ads webhook outcome=test_recorded lead_id=%s', lead['lead_id'])
    return 200, ''


def _record_production(lead):
    if not lead['email'] and not lead['phone']:
        logger.warning('google_ads webhook outcome=missing_contact lead_id=%s', lead['lead_id'])
        return 400, 'A phone number or email address is required.'
    try:
        with transaction.atomic():
            if GoogleAdsIngestionRepository.production_lead(lead['lead_id']):
                logger.info('google_ads webhook outcome=duplicate lead_id=%s', lead['lead_id'])
                return 200, ''
            error, created = LeadService.create_provider_lead({
                'name': lead['name'],
                'email': lead['email'],
                'phone': lead['phone'],
                'city': lead['city'],
                'summary': lead['summary'],
                'source': LEAD_SOURCE_GOOGLE_ADS,
                'touchpoint': TOUCHPOINT_LEAD_FORM,
                'external_id': lead['lead_id'],
            })
            if error:
                raise _PermanentIntakeError(error)
            GoogleAdsIngestionRepository.save_form(created['id'], lead)
            GoogleAdsIngestionRepository.mark_processed(lead['lead_id'], 'lead')
    except _PermanentIntakeError as exc:
        logger.warning('google_ads webhook outcome=rejected lead_id=%s', lead['lead_id'])
        return 400, exc.message
    except IntegrityError:
        if GoogleAdsIngestionRepository.production_lead(lead['lead_id']):
            logger.info('google_ads webhook outcome=duplicate lead_id=%s', lead['lead_id'])
            return 200, ''
        logger.exception('google_ads webhook outcome=conflict_without_lead lead_id=%s', lead['lead_id'])
        raise
    logger.info('google_ads webhook outcome=created lead_id=%s', lead['lead_id'])
    return 200, ''


class _PermanentIntakeError(Exception):
    def __init__(self, message):
        self.message = message
