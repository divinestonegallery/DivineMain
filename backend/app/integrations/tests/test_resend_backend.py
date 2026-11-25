from unittest.mock import patch

from django.core.mail import EmailMessage
from django.test import SimpleTestCase

from app.integrations.resend.backend import ResendEmailBackend


class ResendEmailBackendTests(SimpleTestCase):
    @patch('app.integrations.resend.backend.send_text_email', return_value='email_1')
    def test_plain_text_message_uses_the_idempotency_header(self, send_text):
        message = EmailMessage(
            subject='[DEV] Divine Stone Gallery - Lead Creation Failure - Google Ads',
            body='Source: google_ads',
            from_email='Divine Stone Gallery <hello@mail.divinestonegallery.com>',
            to=['ops@example.com'],
        )
        message.extra_headers['X-Idempotency-Key'] = 'lead-failure/abc'
        sent = ResendEmailBackend().send_messages([message])
        self.assertEqual(sent, 1)
        send_text.assert_called_once_with(
            to=['ops@example.com'],
            subject=message.subject,
            text='Source: google_ads',
            from_email=message.from_email,
            idempotency_key='lead-failure/abc',
        )
