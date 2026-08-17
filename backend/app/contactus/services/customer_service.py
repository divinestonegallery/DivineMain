from app.contactus.repositories.contactus_repository import ContactUsRepository
from app.common.repositories import UploadRepository
from app.common.services.upload_service import UploadService


class ContactUsCustomerService:
    @staticmethod
    def create_contact_message(data):
        if ContactUsRepository.recent_contact_duplicate(data['email'], data['message']):
            return 'This message was already submitted recently.', None
        return None, ContactUsRepository.create_contact(data)

    @staticmethod
    def create_customize_request(data, user_id=None):
        if ContactUsRepository.recent_customize_duplicate(data):
            return 'This customization request was already submitted recently.', None
        object_key = data.get('reference_object_key')
        if not object_key:
            return None, ContactUsRepository.create_customize(data, user_id=user_id)

        session = UploadRepository.claim_pending_session(object_key, user_id)
        if not session or session['purpose'] != 'customization_reference':
            return 'Reference upload is invalid, expired or already used.', None
        error, _metadata = UploadService.inspect_image(object_key, session)
        if error:
            UploadService.delete_object(object_key)
            UploadRepository.mark_rejected(object_key)
            return error, None
        payload = {
            **data,
            'reference_image': UploadService.public_url(object_key),
        }
        result = ContactUsRepository.create_customize(payload, user_id=user_id)
        UploadRepository.mark_attached(object_key)
        return None, result
