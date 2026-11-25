import logging
import time

from django.conf import settings

logger = logging.getLogger(__name__)

_RETRY_DELAYS_SECONDS = (0.5, 1.0)


def send_template_email(*, to, template_id, variables, idempotency_key, from_email=None):
    """Send one Resend template email.

    Returns the provider email id, or None when the send did not succeed.
    Network failures, HTTP 429, and HTTP 5xx are retried. Other 4xx responses
    are not, because the same request will fail again.
    """
    api_key = settings.RESEND_API_KEY
    if not api_key or not template_id or not to:
        logger.error('Transactional email is not configured')
        return None

    import resend

    resend.api_key = api_key
    params = {
        'to': [to],
        'template': {
            'id': template_id,
            'variables': variables,
        },
    }
    sender = from_email or settings.RESEND_FROM_EMAIL
    if sender:
        params['from'] = sender
    options = {'idempotency_key': idempotency_key}

    attempts = len(_RETRY_DELAYS_SECONDS) + 1
    for attempt in range(attempts):
        try:
            result = resend.Emails.send(params, options)
        except Exception as exc:
            if attempt < attempts - 1 and _should_retry(exc):
                time.sleep(_delay_seconds(exc, attempt))
                continue
            logger.error('Transactional email failed: %s', exc.__class__.__name__)
            return None

        email_id = _email_id(result)
        if email_id:
            return email_id
        logger.error('Transactional email returned no id')
        return None
    return None


def send_text_email(*, to, subject, text, from_email=None, idempotency_key=None):
    """Send one plain-text Resend email.

    Returns the provider email id, or None when the send did not succeed.
    This attempt is not retried here. Lead-failure delivery is retried by
    ``retry_lead_failure_notifications`` so a slow provider does not hold a
    request open. The exception text is not logged; it can echo the payload.
    """
    recipients = [item.strip() for item in to if item and item.strip()]
    sender = (from_email or settings.RESEND_FROM_EMAIL or '').strip()
    if not settings.RESEND_API_KEY or not recipients or not sender or not subject or not text:
        logger.error('Plain-text email is not configured')
        return None

    import resend

    resend.api_key = settings.RESEND_API_KEY
    params = {
        'from': sender,
        'to': recipients,
        'subject': subject,
        'text': text,
    }
    options = {'idempotency_key': idempotency_key} if idempotency_key else None
    try:
        result = resend.Emails.send(params, options) if options else resend.Emails.send(params)
    except Exception as exc:
        logger.error('Plain-text email failed: %s', exc.__class__.__name__)
        return None
    email_id = _email_id(result)
    if not email_id:
        logger.error('Plain-text email returned no id')
    return email_id


def _email_id(result):
    if isinstance(result, dict):
        return result.get('id') or None
    return getattr(result, 'id', None)


def _should_retry(exc):
    status = _status_code(exc)
    if status == 429 or (status is not None and status >= 500):
        return True
    if status is not None:
        return False
    return exc.__class__.__name__ in {
        'Timeout',
        'ConnectTimeout',
        'ReadTimeout',
        'ConnectionError',
    }


def _status_code(exc):
    for name in ('status_code', 'code', 'status'):
        value = getattr(exc, name, None)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)
    return None


def _delay_seconds(exc, attempt):
    delay = _RETRY_DELAYS_SECONDS[min(attempt, len(_RETRY_DELAYS_SECONDS) - 1)]
    retry_after = getattr(exc, 'headers', None) or {}
    if isinstance(retry_after, dict):
        raw = retry_after.get('retry-after') or retry_after.get('Retry-After')
        try:
            requested = float(raw)
        except (TypeError, ValueError):
            requested = None
        if requested is not None:
            delay = min(requested, 2.0)
    return delay
