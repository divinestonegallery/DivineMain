from django.db import models

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UploadSession(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VALIDATING = "validating", "Validating"
        ATTACHED = "attached", "Attached"
        REJECTED = "rejected", "Rejected"
        DELETED = "deleted", "Deleted"

    class Purpose(models.TextChoices):
        PRODUCT_IMAGE = "product_image", "Product image"
        CUSTOMIZATION_REFERENCE = "customization_reference", "Customization reference"

    object_key = models.CharField(max_length=500, unique=True)
    purpose = models.CharField(max_length=40, choices=Purpose.choices)
    expected_content_type = models.CharField(max_length=100)
    expected_size = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField(db_index=True)
    attached_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(
        "accounts.Customer",
        related_name="upload_sessions",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )


class ProcessedWebhook(BaseModel):
    provider = models.CharField(max_length=40)
    event_id = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("provider", "event_id"),
                name="unique_processed_webhook_event",
            )
        ]


class StaffAuditLog(BaseModel):
    actor = models.ForeignKey(
        "accounts.Customer",
        related_name="audit_logs",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    request_id = models.UUIDField(db_index=True)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.PositiveSmallIntegerField()
    ip_address = models.GenericIPAddressField(blank=True, null=True)


class APIErrorLog(BaseModel):
    request_id = models.UUIDField(db_index=True)
    actor = models.ForeignKey(
        "accounts.Customer",
        related_name="api_errors",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.PositiveSmallIntegerField()
    error_type = models.CharField(max_length=150, blank=True)
    message = models.CharField(max_length=1000, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)


class RateLimitBucket(BaseModel):
    """Shared fixed-window counter for sensitive public API operations."""

    scope = models.CharField(max_length=80)
    identity_hash = models.CharField(max_length=64)
    window_started_at = models.DateTimeField()
    request_count = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("scope", "identity_hash"),
                name="unique_rate_limit_scope_identity",
            )
        ]
        indexes = [
            models.Index(fields=("scope", "window_started_at"), name="rate_limit_scope_window_idx")
        ]
