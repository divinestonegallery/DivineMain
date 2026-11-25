from django.core.mail.backends.base import BaseEmailBackend

from app.integrations.resend.client import send_text_email


class ResendEmailBackend(BaseEmailBackend):
    """Deliver Django email messages as plain-text Resend emails.

    Order receipts do not use this backend. They send a hosted Resend template
    directly. This backend is for operational mail such as lead-failure notices.
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        sent = 0
        for message in email_messages:
            headers = message.extra_headers or {}
            email_id = send_text_email(
                to=list(message.to or []),
                subject=message.subject,
                text=message.body,
                from_email=message.from_email,
                idempotency_key=headers.get('X-Idempotency-Key') or None,
            )
            if not email_id:
                if not self.fail_silently:
                    raise RuntimeError('Operational email was not accepted')
                continue
            sent += 1
        return sent
