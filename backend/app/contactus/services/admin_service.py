from app.contactus.repositories.contactus_repository import ContactUsRepository


class ContactUsAdminService:
    CONTACT_TRANSITIONS = {
        'new': {'contacted', 'closed'},
        'contacted': {'closed'},
        'closed': set(),
    }
    CUSTOMIZE_TRANSITIONS = {
        'new': {'contacted', 'closed'},
        'contacted': {'quoted', 'closed'},
        'quoted': {'accepted', 'closed'},
        'accepted': {'closed'},
        'closed': set(),
    }

    @staticmethod
    def get_contact_messages(params):
        return None, ContactUsRepository.list_contact_messages(params)

    @staticmethod
    def get_customize_requests(params):
        return None, ContactUsRepository.list_customize_requests(params)

    @staticmethod
    def update_contact_status(message_id, target):
        current = ContactUsRepository.get_contact(message_id)
        if not current:
            return 'Contact message not found.', None
        if target != current['status'] and target not in ContactUsAdminService.CONTACT_TRANSITIONS[current['status']]:
            return f"Cannot move contact request from {current['status']} to {target}.", None
        return None, ContactUsRepository.update_contact_status(message_id, target)

    @staticmethod
    def update_customize_status(request_id, target):
        current = ContactUsRepository.get_customize(request_id)
        if not current:
            return 'Customization request not found.', None
        if target != current['status'] and target not in ContactUsAdminService.CUSTOMIZE_TRANSITIONS[current['status']]:
            return f"Cannot move customization request from {current['status']} to {target}.", None
        return None, ContactUsRepository.update_customize_status(request_id, target)
