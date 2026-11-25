import hashlib
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import IntegrityError, connection, transaction
from django.db.models import Q
from django.db.utils import DatabaseError, InterfaceError, OperationalError
from django.utils import timezone

from app.common.request_context import current_request_id
from app.leads.models import LeadFailureAlert

logger = logging.getLogger(__name__)

BURST_WINDOW = timedelta(minutes=15)
SENDING_STALE_AFTER = timedelta(minutes=15)
SUMMARY_LIMIT = 500

_SOURCE_LABELS = {
    'website': 'Website',
    'organic': 'Organic',
    'google_ads': 'Google Ads',
    'manual': 'Staff',
    'meta_ads': 'Meta Ads',
}

_EMAIL = re.compile(r'[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', re.IGNORECASE)
_PHONE = re.compile(r'(?:\+?\d[\d\s\-()]{6,}\d)')
_SECRET = re.compile(
    r'(?i)\b(?:re_|sk_|whsec_|rk_|bearer\s+)[A-Za-z0-9_\-.=]{6,}'
)
_ASSIGNED_SECRET = re.compile(
    r'(?i)\b(api[_ ]?key|secret|password|token|signature|google_key|authorization)\b\s*[:=]\s*\S+'
)
_JWT = re.compile(r'eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]+')


def stage_for_exception(exc):
    """Classify an unexpected exception for the operational email."""
    if isinstance(exc, DatabaseError):
        return 'persistence'
    return 'processing'


def sanitize_error_message(value, limit=SUMMARY_LIMIT):
    """Remove contact details and credentials from an exception string."""
    text = ' '.join(str(value or '').split())
    text = _JWT.sub('[redacted-token]', text)
    text = _SECRET.sub('[redacted-secret]', text)
    text = _ASSIGNED_SECRET.sub(lambda match: f'{match.group(1)}=[redacted]', text)
    text = _EMAIL.sub('[redacted-email]', text)
    text = _PHONE.sub('[redacted-phone]', text)
    return text[:limit]


class LeadFailureNotificationService:
    """Report an unexpected lead-creation failure to the operations mailbox.

    Call ``notify`` from the exception handler that runs after the lead
    transaction has rolled back. Do not call it from inside that transaction:
    the transaction may hold a PostgreSQL advisory lock, and a rollback will
    discard an alert row inserted there. ``transaction.on_commit`` is not used
    for these alerts, because a rolled-back lead transaction never runs it.

    A successful lead, a validation error, a duplicate submission, an active
    lead reuse, a 30-day login suppression, an employee session, and an
    identity-conflict outcome are not failures. Do not notify for them.

    Future providers, including Meta Ads, use the same call. A Meta webhook
    that fails after its own atomic block should do this and then re-raise or
    return its existing error response:

        LeadFailureNotificationService.notify(
            source='meta_ads',
            flow='meta_ads_lead_webhook',
            operation='MetaAdsLeadIntegrationService.ingest',
            stage='persistence',
            error=exc,
            external_reference=event_id,
            dedupe_on_reference=True,
        )

    ``dedupe_on_reference`` is for one provider event that will be retried.
    Website, staff, and organic failures leave it false so a database outage
    sends one email per source and error category each 15 minutes instead of
    one email per visitor.

    When the database itself is down, the alert row cannot be stored. One
    email is attempted and both failures are logged. That fallback cannot
    deduplicate across workers or processes. Notification errors are swallowed
    so they cannot replace the original exception.
    """

    @staticmethod
    def notify(
        *,
        source,
        flow,
        operation,
        stage,
        error,
        error_category='',
        external_reference='',
        request_id=None,
        dedupe_on_reference=False,
    ):
        try:
            _notify(
                source=source,
                flow=flow,
                operation=operation,
                stage=stage,
                error=error,
                error_category=error_category,
                external_reference=external_reference or '',
                request_id=current_request_id() if request_id is None else str(request_id or ''),
                dedupe_on_reference=dedupe_on_reference,
            )
        except Exception:
            logger.error(
                'lead_failure_notification_failed source=%s flow=%s operation=%s error=%s',
                source,
                flow,
                operation,
                'NotificationError',
            )

    @staticmethod
    def retry_pending(limit):
        """Send stored alerts that have not been delivered. Returns a summary."""
        problem = _configuration_problem()
        if problem:
            waiting = LeadFailureAlert.objects.filter(
                delivery_status__in=(
                    LeadFailureAlert.STATUS_PENDING,
                    LeadFailureAlert.STATUS_FAILED,
                    LeadFailureAlert.STATUS_UNCONFIGURED,
                ),
            ).count()
            logger.error(
                'lead_failure_notification retry_skipped reason=%s waiting=%s',
                problem,
                waiting,
            )
            return {'sent': 0, 'failed': 0, 'skipped': waiting, 'reason': problem}

        sent = 0
        failed = 0
        skipped = 0
        stale_before = timezone.now() - SENDING_STALE_AFTER
        ready = Q(delivery_status__in=(
            LeadFailureAlert.STATUS_PENDING,
            LeadFailureAlert.STATUS_FAILED,
            LeadFailureAlert.STATUS_UNCONFIGURED,
        )) | Q(delivery_status=LeadFailureAlert.STATUS_SENDING, last_attempt_at__lt=stale_before)
        candidate_ids = list(
            LeadFailureAlert.objects.filter(ready)
            .order_by('first_occurred_at', 'id')
            .values_list('id', flat=True)[:limit]
        )
        for alert_id in candidate_ids:
            claimed = _claim_for_retry(alert_id, stale_before)
            if claimed is None:
                skipped += 1
                continue
            if _deliver_existing(claimed):
                sent += 1
            else:
                failed += 1
        logger.info(
            'lead_failure_notification retry sent=%s failed=%s skipped=%s',
            sent,
            failed,
            skipped,
        )
        return {'sent': sent, 'failed': failed, 'skipped': skipped, 'reason': ''}

    @staticmethod
    def prune(retention_days):
        cutoff = timezone.now() - timedelta(days=retention_days)
        deleted, _ = LeadFailureAlert.objects.filter(created_at__lt=cutoff).delete()
        return deleted


def _notify(
    *,
    source,
    flow,
    operation,
    stage,
    error,
    error_category,
    external_reference,
    request_id,
    dedupe_on_reference,
):
    occurred_at = timezone.now()
    category = (error_category or _category(error))[:80]
    message = sanitize_error_message(error if isinstance(error, str) else str(error))
    if not message:
        message = category or 'Lead creation failed'
    reference = str(external_reference or '')[:255]
    event = {
        'source': str(source)[:40],
        'flow': str(flow)[:64],
        'operation': str(operation)[:120],
        'stage': str(stage)[:40],
        'error_category': category,
        'external_reference': reference,
        'safe_error_message': message,
        'request_id': str(request_id or '')[:64],
        'occurred_at': occurred_at,
        'dedupe_on_reference': bool(dedupe_on_reference and reference),
    }
    logger.error(
        'lead_failure source=%s flow=%s operation=%s stage=%s category=%s reference=%s request_id=%s message=%s',
        event['source'],
        event['flow'],
        event['operation'],
        event['stage'],
        event['error_category'],
        event['external_reference'],
        event['request_id'],
        event['safe_error_message'],
    )
    fingerprint = _fingerprint(event)
    try:
        alert, should_send = _claim(event, fingerprint)
    except (OperationalError, InterfaceError):
        logger.error(
            'lead_failure_alert_not_stored deduplication_unavailable=database_down source=%s category=%s reference=%s',
            event['source'],
            event['error_category'],
            event['external_reference'],
        )
        try:
            _send(event, fingerprint)
        except Exception as exc:
            logger.error(
                'lead_failure_notification direct_delivery_failed error=%s',
                exc.__class__.__name__,
            )
        return
    if not should_send:
        logger.warning(
            'lead_failure_notification suppressed source=%s category=%s reference=%s suppressed_count=%s',
            event['source'],
            event['error_category'],
            event['external_reference'],
            alert.suppressed_count,
        )
        return
    _deliver_existing(alert)


def _category(error):
    if isinstance(error, BaseException):
        return error.__class__.__name__
    return 'error'


def _fingerprint(event):
    if event['dedupe_on_reference']:
        parts = [
            event['source'],
            event['operation'],
            event['stage'],
            event['error_category'],
            event['external_reference'],
        ]
    else:
        bucket = int(event['occurred_at'].timestamp()) // int(BURST_WINDOW.total_seconds())
        parts = [event['source'], event['error_category'], str(bucket)]
    digest = hashlib.sha256('|'.join(parts).encode()).hexdigest()
    return digest


def _claim(event, fingerprint):
    try:
        return _insert_or_suppress(event, fingerprint)
    except IntegrityError:
        return _suppress_existing(event, fingerprint)


def _insert_or_suppress(event, fingerprint):
    with transaction.atomic():
        _lock(fingerprint)
        existing = LeadFailureAlert.objects.select_for_update().filter(fingerprint=fingerprint).first()
        if existing:
            return _mark_suppressed(existing, event), False
        alert = LeadFailureAlert.objects.create(
            fingerprint=fingerprint,
            source=event['source'],
            flow=event['flow'],
            operation=event['operation'],
            stage=event['stage'],
            error_category=event['error_category'],
            external_reference=event['external_reference'],
            safe_error_summary=event['safe_error_message'],
            first_occurred_at=event['occurred_at'],
            last_occurred_at=event['occurred_at'],
            occurrence_count=1,
            suppressed_count=0,
            delivery_status=LeadFailureAlert.STATUS_PENDING,
            request_id=event['request_id'],
        )
        return alert, True


def _suppress_existing(event, fingerprint):
    with transaction.atomic():
        _lock(fingerprint)
        existing = LeadFailureAlert.objects.select_for_update().filter(fingerprint=fingerprint).first()
        if not existing:
            raise LeadFailureAlert.DoesNotExist
        return _mark_suppressed(existing, event), False


def _mark_suppressed(alert, event):
    alert.occurrence_count += 1
    alert.suppressed_count += 1
    alert.last_occurred_at = event['occurred_at']
    alert.safe_error_summary = event['safe_error_message']
    if event['request_id'] and not alert.request_id:
        alert.request_id = event['request_id']
    alert.save(update_fields=[
        'occurrence_count',
        'suppressed_count',
        'last_occurred_at',
        'safe_error_summary',
        'request_id',
        'updated_at',
    ])
    return alert


def _lock(fingerprint):
    if connection.vendor != 'postgresql':
        return
    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))',
            [f'lead-failure:{fingerprint}'],
        )


def _deliver_existing(alert):
    event = _event_from_alert(alert)
    try:
        result = _send(event, alert.fingerprint)
    except Exception as exc:
        logger.error(
            'lead_failure_notification delivery_failed fingerprint=%s error=%s',
            alert.fingerprint,
            exc.__class__.__name__,
        )
        result = 'failed'
    _store_delivery(alert, result)
    return result == 'sent'


def _store_delivery(alert, result):
    status = {
        'sent': LeadFailureAlert.STATUS_SENT,
        'failed': LeadFailureAlert.STATUS_FAILED,
    }.get(result, LeadFailureAlert.STATUS_UNCONFIGURED)
    alert.delivery_status = status
    alert.last_attempt_at = timezone.now()
    try:
        alert.save(update_fields=['delivery_status', 'last_attempt_at', 'updated_at'])
    except (OperationalError, InterfaceError):
        logger.error(
            'lead_failure_notification status_not_stored fingerprint=%s status=%s',
            alert.fingerprint,
            status,
        )


def _claim_for_retry(alert_id, stale_before):
    with transaction.atomic():
        alert = (
            LeadFailureAlert.objects.select_for_update(skip_locked=True)
            .filter(id=alert_id)
            .first()
        )
        if alert is None or alert.delivery_status == LeadFailureAlert.STATUS_SENT:
            return None
        if (
            alert.delivery_status == LeadFailureAlert.STATUS_SENDING
            and alert.last_attempt_at
            and alert.last_attempt_at >= stale_before
        ):
            return None
        alert.delivery_status = LeadFailureAlert.STATUS_SENDING
        alert.last_attempt_at = timezone.now()
        alert.save(update_fields=['delivery_status', 'last_attempt_at', 'updated_at'])
        return alert


def _event_from_alert(alert):
    return {
        'source': alert.source,
        'flow': alert.flow,
        'operation': alert.operation,
        'stage': alert.stage,
        'error_category': alert.error_category,
        'external_reference': alert.external_reference,
        'safe_error_message': alert.safe_error_summary,
        'request_id': alert.request_id,
        'occurred_at': alert.first_occurred_at,
    }


def _configuration_problem():
    if not settings.LEAD_FAILURE_NOTIFICATION_EMAILS:
        return 'recipients'
    if not (settings.DEFAULT_FROM_EMAIL or settings.RESEND_FROM_EMAIL):
        return 'from_address'
    if not settings.IS_TESTING and not settings.RESEND_API_KEY:
        return 'api_key'
    return ''


def _send(event, idempotency_key):
    problem = _configuration_problem()
    if problem:
        logger.error(
            'lead_failure_notification not_sent reason=%s source=%s flow=%s operation=%s stage=%s category=%s reference=%s request_id=%s',
            problem,
            event['source'],
            event['flow'],
            event['operation'],
            event['stage'],
            event['error_category'],
            event['external_reference'],
            event['request_id'],
        )
        return problem
    message = EmailMessage(
        subject=_subject(event),
        body=_body(event),
        from_email=settings.DEFAULT_FROM_EMAIL or settings.RESEND_FROM_EMAIL,
        to=list(settings.LEAD_FAILURE_NOTIFICATION_EMAILS),
    )
    message.extra_headers['X-Idempotency-Key'] = f'lead-failure/{idempotency_key}'
    message.send(fail_silently=False)
    return 'sent'


def _subject(event):
    environment = (settings.ENVIRONMENT or 'unknown').upper()
    label = _SOURCE_LABELS.get(event['source'], event['source'].replace('_', ' ').title())
    return f'[{environment}] Divine Stone Gallery - Lead Creation Failure - {label}'


def _body(event):
    occurred = event['occurred_at'].isoformat() if event['occurred_at'] else ''
    lines = [
        f'Environment: {settings.ENVIRONMENT or "unknown"}',
        f'Source: {event["source"]}',
        f'Flow: {event["flow"]}',
        f'Operation: {event["operation"]}',
        f'Stage: {event["stage"]}',
        f'Error category: {event["error_category"]}',
        f'Occurred at: {occurred}',
        f'Request ID: {event["request_id"] or "unavailable"}',
        f'External reference: {event["external_reference"] or "unavailable"}',
        f'Message: {event["safe_error_message"]}',
        '',
        'The lead operation was not changed by this email.',
        'If the database was unavailable, this message may not have been deduplicated across workers.',
    ]
    return '\n'.join(lines)
