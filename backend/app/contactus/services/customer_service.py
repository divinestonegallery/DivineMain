from django.db import IntegrityError, transaction

from app.common.repositories import UploadRepository
from app.common.services.upload_service import UploadService
from app.contactus.repositories.contactus_repository import ContactUsRepository
from app.leads.attribution import attribution_from
from app.leads.constants import LEAD_SOURCE_WEBSITE
from app.leads.repositories.lead_repository import LeadRepository
from app.leads.services.lead_service import LeadService


class _IntakeAbort(Exception):
    def __init__(self, message):
        self.message = message


class ContactUsCustomerService:
    @staticmethod
    def generate_upload_url(data, actor_id):
        """Generate a presigned PUT URL for a customization reference image upload."""
        payload = {**data, 'purpose': 'customization_reference'}
        return UploadService.create_presigned_upload(payload, actor_id)

    @staticmethod
    def create_contact_message(data):
        attribution = attribution_from(data)
        submission_key = attribution['submission_key']
        if submission_key:
            existing = ContactUsRepository.get_contact_by_submission_key(submission_key)
            if existing:
                return None, existing
        email = data.get('email') or ''
        phone = data.get('phone') or ''
        if ContactUsRepository.recent_contact_duplicate(email, data['message'], phone):
            return 'This message was already submitted recently.', None
        try:
            with transaction.atomic():
                # The check above can pass for two requests at once. Hold the
                # same person lock the lead write uses, then look again so the
                # waiter sees the enquiry the first request committed.
                LeadRepository.lock_identity(email, phone)
                if ContactUsRepository.recent_contact_duplicate(email, data['message'], phone):
                    raise _IntakeAbort('This message was already submitted recently.')
                lead_error, lead = LeadService.record_website_enquiry(
                    _contact_lead_data(data, attribution),
                    created_by_id=None,
                )
                if lead_error:
                    raise _IntakeAbort(lead_error)
                created = ContactUsRepository.create_contact({
                    'name': data['name'],
                    'email': email,
                    'phone': phone,
                    'message': data['message'],
                    'submission_key': submission_key,
                    'lead_id': lead['id'],
                })
        except _IntakeAbort as exc:
            return exc.message, None
        except IntegrityError:
            if submission_key:
                existing = ContactUsRepository.get_contact_by_submission_key(submission_key)
                if existing:
                    return None, existing
            return 'This message was already submitted recently.', None
        return None, created

    @staticmethod
    def create_customize_request(data, user_id=None, account_email=''):
        attribution = attribution_from(data)
        submission_key = attribution['submission_key']
        if submission_key:
            existing = ContactUsRepository.get_customize_by_submission_key(submission_key)
            if existing:
                return None, existing
        if ContactUsRepository.recent_customize_duplicate(data):
            return 'This customization request was already submitted recently.', None

        object_key = data.get('reference_object_key')
        reference_image = ''
        if object_key:
            session = UploadRepository.claim_pending_session(object_key, user_id)
            if not session or session['purpose'] != 'customization_reference':
                return 'Reference upload is invalid, expired or already used.', None
            error, _metadata = UploadService.inspect_image(object_key, session)
            if error:
                UploadService.delete_object(object_key)
                UploadRepository.mark_rejected(object_key)
                return error, None
            reference_image = UploadService.public_url(object_key)

        try:
            with transaction.atomic():
                lock_email = account_email if account_email and not (data.get('email') or '') else (data.get('email') or '')
                LeadRepository.lock_identity(lock_email, data.get('phone') or '')
                if ContactUsRepository.recent_customize_duplicate(data):
                    raise _IntakeAbort('This customization request was already submitted recently.')
                lead_error, lead = LeadService.record_website_enquiry(
                    _customize_lead_data(data, attribution),
                    created_by_id=user_id,
                    account_email=account_email,
                )
                if lead_error:
                    raise _IntakeAbort(lead_error)
                payload = {
                    'name': data.get('name'),
                    'email': data.get('email') or '',
                    'phone': data.get('phone') or '',
                    'city': data['city'],
                    'pincode': data.get('pincode') or '',
                    'approximate_height': data.get('approximate_height') or '',
                    'preferred_material': data.get('preferred_material') or '',
                    'description': data.get('description') or '',
                    'submission_key': submission_key,
                    'lead_id': lead['id'],
                }
                if reference_image:
                    payload['reference_image'] = reference_image
                    payload['reference_object_key'] = object_key
                created = ContactUsRepository.create_customize(payload, user_id=user_id)
                if object_key:
                    UploadRepository.mark_attached(object_key)
        except _IntakeAbort as exc:
            if object_key:
                UploadRepository.release_validating_session(object_key)
            return exc.message, None
        except IntegrityError:
            if object_key:
                UploadRepository.release_validating_session(object_key)
            if submission_key:
                existing = ContactUsRepository.get_customize_by_submission_key(submission_key)
                if existing:
                    return None, existing
            return 'This customization request was already submitted recently.', None
        except Exception:
            if object_key:
                UploadRepository.release_validating_session(object_key)
            raise
        return None, created


def _contact_lead_data(data, attribution):
    return {
        'name': data['name'],
        'email': data.get('email') or '',
        'phone': data.get('phone') or '',
        'city': data.get('city') or '',
        'summary': data['message'],
        'source': LEAD_SOURCE_WEBSITE,
        'touchpoint': data.get('touchpoint'),
        **{key: attribution[key] for key in (
            'landing_path', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        )},
    }


def _customize_lead_data(data, attribution):
    details = [
        data.get('description') or '',
        data.get('preferred_material') or '',
        data.get('approximate_height') or '',
    ]
    summary = ' · '.join(part for part in details if part) or 'Custom moorti enquiry'
    return {
        'name': data.get('name') or 'Custom moorti enquiry',
        'email': data.get('email') or '',
        'phone': data.get('phone') or '',
        'city': data.get('city') or '',
        'summary': summary[:5000],
        'source': LEAD_SOURCE_WEBSITE,
        'touchpoint': data.get('touchpoint'),
        **{key: attribution[key] for key in (
            'landing_path', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        )},
    }
