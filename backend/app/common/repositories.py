from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, connection, transaction
from django.utils import timezone

from app.common.models import (
    APIErrorLog,
    ProcessedWebhook,
    RateLimitBucket,
    StaffAuditLog,
    UploadSession,
)
from app.common.serializers import APIErrorLogSerializer, StaffAuditLogSerializer, UploadSessionSerializer


def _page(queryset, page, page_size, serializer_class):
    total = queryset.count()
    start = (page - 1) * page_size
    items = serializer_class(queryset[start:start + page_size], many=True).data
    return {
        'items': items,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_items': total,
            'total_pages': (total + page_size - 1) // page_size,
        },
    }


class UploadRepository:
    @staticmethod
    def create_session(data):
        session = UploadSession.objects.create(**data)
        return UploadSessionSerializer(session).data

    @staticmethod
    def get_pending_session(object_key):
        session = UploadSession.objects.filter(
            object_key=object_key,
            status=UploadSession.Status.PENDING,
            expires_at__gt=timezone.now(),
        ).first()
        return UploadSessionSerializer(session).data if session else None

    @staticmethod
    def claim_pending_session(object_key, actor_id):
        """Atomically reserve an unexpired upload for exactly one finalizer."""
        with transaction.atomic():
            updated = UploadSession.objects.filter(
                object_key=object_key,
                created_by_id=actor_id,
                status=UploadSession.Status.PENDING,
                expires_at__gt=timezone.now(),
            ).update(
                status=UploadSession.Status.VALIDATING,
                expires_at=timezone.now() + timedelta(minutes=settings.R2_FINALIZATION_TTL_MINUTES),
            )
            if not updated:
                return None
            session = UploadSession.objects.get(object_key=object_key)
            return UploadSessionSerializer(session).data

    @staticmethod
    def mark_status(object_key, status, attached=False):
        updates = {'status': status}
        if attached:
            updates['attached_at'] = timezone.now()
        updated = UploadSession.objects.filter(object_key=object_key).update(**updates)
        return bool(updated)

    @staticmethod
    def mark_rejected(object_key):
        return UploadRepository.mark_status(object_key, UploadSession.Status.REJECTED)

    @staticmethod
    def mark_attached(object_key):
        return UploadRepository.mark_status(
            object_key,
            UploadSession.Status.ATTACHED,
            attached=True,
        )

    @staticmethod
    def mark_deleted(object_key):
        return UploadRepository.mark_status(object_key, UploadSession.Status.DELETED)

    @staticmethod
    def expired_pending_keys(limit=100):
        return list(
            UploadSession.objects.filter(
                status__in=(UploadSession.Status.PENDING, UploadSession.Status.VALIDATING),
                expires_at__lte=timezone.now(),
            ).order_by('expires_at').values_list('object_key', flat=True)[:limit]
        )


class WebhookRepository:
    @staticmethod
    def claim(provider, event_id, event_type):
        try:
            with transaction.atomic():
                ProcessedWebhook.objects.create(
                    provider=provider,
                    event_id=event_id,
                    event_type=event_type or '',
                )
            return True
        except IntegrityError:
            return False

    @staticmethod
    def release(provider, event_id):
        ProcessedWebhook.objects.filter(provider=provider, event_id=event_id).delete()


class RateLimitRepository:
    @staticmethod
    def consume(scope, identity_hash, limit, duration_seconds):
        """Atomically consume one fixed-window allowance from the shared database."""
        now = timezone.now()
        window_cutoff = now - timedelta(seconds=duration_seconds)
        for attempt in range(2):
            try:
                with transaction.atomic():
                    bucket = RateLimitBucket.objects.select_for_update().filter(
                        scope=scope,
                        identity_hash=identity_hash,
                    ).first()
                    if bucket is None:
                        RateLimitBucket.objects.create(
                            scope=scope,
                            identity_hash=identity_hash,
                            window_started_at=now,
                            request_count=1,
                        )
                        return True, duration_seconds
                    if bucket.window_started_at <= window_cutoff:
                        bucket.window_started_at = now
                        bucket.request_count = 1
                        bucket.save(update_fields=("window_started_at", "request_count", "updated_at"))
                        return True, duration_seconds

                    elapsed = (now - bucket.window_started_at).total_seconds()
                    wait_seconds = max(1, int(duration_seconds - elapsed + 0.999))
                    if bucket.request_count >= limit:
                        return False, wait_seconds
                    bucket.request_count += 1
                    bucket.save(update_fields=("request_count", "updated_at"))
                    return True, wait_seconds
            except IntegrityError:
                if attempt:
                    raise
        return False, duration_seconds


class OperationsRepository:
    @staticmethod
    def write_audit(data):
        StaffAuditLog.objects.create(**data)

    @staticmethod
    def write_error(data):
        APIErrorLog.objects.create(**data)

    @staticmethod
    def list_audits(page, page_size):
        queryset = StaffAuditLog.objects.select_related('actor').order_by('-created_at')
        return _page(queryset, page, page_size, StaffAuditLogSerializer)

    @staticmethod
    def list_errors(page, page_size):
        queryset = APIErrorLog.objects.select_related('actor').order_by('-created_at')
        return _page(queryset, page, page_size, APIErrorLogSerializer)

    @staticmethod
    def database_ready():
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            return cursor.fetchone()[0] == 1

    @staticmethod
    def cleanup_retained_data(audit_cutoff, error_cutoff, webhook_cutoff, upload_cutoff):
        audit_deleted, _ = StaffAuditLog.objects.filter(created_at__lt=audit_cutoff).delete()
        error_deleted, _ = APIErrorLog.objects.filter(created_at__lt=error_cutoff).delete()
        webhook_deleted, _ = ProcessedWebhook.objects.filter(created_at__lt=webhook_cutoff).delete()
        upload_deleted, _ = UploadSession.objects.exclude(
            status__in=(UploadSession.Status.PENDING, UploadSession.Status.VALIDATING),
        ).filter(created_at__lt=upload_cutoff).delete()
        rate_limit_deleted, _ = RateLimitBucket.objects.filter(
            updated_at__lt=timezone.now() - timedelta(days=2),
        ).delete()
        return {
            'audit_logs': audit_deleted,
            'error_logs': error_deleted,
            'webhook_events': webhook_deleted,
            'upload_sessions': upload_deleted,
            'rate_limit_buckets': rate_limit_deleted,
        }
