import uuid

from django.db import models

from app.accounts.models import Employee, User
from app.common.models import BaseModel
from app.leads.constants import (
    LEAD_SOURCES,
    LEAD_SOURCE_MANUAL,
    LEAD_SOURCE_ORDER,
    LEAD_STATUSES,
    LEAD_STATUS_NEW,
    LEAD_STATUS_ORDER,
    LEAD_TOUCHPOINT_ORDER,
    NOTIFICATION_ASSIGNED,
    NOTIFICATION_FOLLOW_UP_DUE,
)


class StaffSecurityGroup(BaseModel):
    """Named set of LMS permission codes assigned to staff accounts."""

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class StaffGroupPermission(BaseModel):
    group = models.ForeignKey(
        StaffSecurityGroup,
        related_name='permissions',
        on_delete=models.CASCADE,
    )
    code = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('group', 'code'),
                name='unique_staff_group_permission',
            ),
        ]


class StaffGroupMembership(BaseModel):
    employee = models.ForeignKey(
        Employee,
        related_name='staff_group_memberships',
        on_delete=models.CASCADE,
    )
    group = models.ForeignKey(
        StaffSecurityGroup,
        related_name='memberships',
        on_delete=models.CASCADE,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('employee', 'group'),
                name='unique_staff_group_membership',
            ),
        ]


class Lead(BaseModel):
    uid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    city = models.CharField(max_length=100, blank=True)
    summary = models.TextField()
    source = models.CharField(max_length=32, choices=LEAD_SOURCES, default=LEAD_SOURCE_MANUAL, db_index=True)
    touchpoint = models.CharField(max_length=32, blank=True, default='')
    utm_source = models.CharField(max_length=120, blank=True, default='')
    utm_medium = models.CharField(max_length=120, blank=True, default='')
    utm_campaign = models.CharField(max_length=120, blank=True, default='')
    utm_term = models.CharField(max_length=120, blank=True, default='')
    utm_content = models.CharField(max_length=120, blank=True, default='')
    landing_path = models.CharField(max_length=200, blank=True, default='')
    external_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=LEAD_STATUSES, default=LEAD_STATUS_NEW)
    user = models.ForeignKey(
        User,
        related_name='owned_leads',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    assigned_to = models.ForeignKey(
        Employee,
        related_name='assigned_leads',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    created_by = models.ForeignKey(
        User,
        related_name='created_leads',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    created_by_employee = models.ForeignKey(
        Employee,
        related_name='created_leads',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    follow_up_at = models.DateTimeField(blank=True, null=True)
    # Set equal to follow_up_at after a reminder is sent. Cleared when the
    # follow-up time changes so the next due time can notify exactly once.
    follow_up_notified_at = models.DateTimeField(blank=True, null=True)
    lost_reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['status'], name='lead_status_idx'),
            models.Index(fields=['follow_up_at'], name='lead_follow_up_idx'),
            models.Index(fields=['email'], name='lead_email_idx'),
            models.Index(fields=['phone'], name='lead_phone_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=('source', 'external_id'),
                condition=models.Q(external_id__isnull=False),
                name='lead_source_external_uniq',
            ),
            models.CheckConstraint(
                check=models.Q(status__in=LEAD_STATUS_ORDER),
                name='lead_status_valid',
            ),
            models.CheckConstraint(
                check=models.Q(source__in=LEAD_SOURCE_ORDER),
                name='lead_source_valid',
            ),
            models.CheckConstraint(
                check=models.Q(touchpoint='') | models.Q(touchpoint__in=LEAD_TOUCHPOINT_ORDER),
                name='lead_touchpoint_valid',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.uid})'


class LeadNote(BaseModel):
    lead = models.ForeignKey(Lead, related_name='notes', on_delete=models.CASCADE)
    author = models.ForeignKey(
        Employee,
        related_name='lead_notes',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    body = models.TextField()

    class Meta:
        ordering = ['created_at', 'id']


class LeadActivity(BaseModel):
    lead = models.ForeignKey(Lead, related_name='activities', on_delete=models.CASCADE)
    actor = models.ForeignKey(
        Employee,
        related_name='lead_activities',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    action = models.CharField(max_length=40)
    field_name = models.CharField(max_length=40, blank=True)
    old_value = models.CharField(max_length=500, blank=True)
    new_value = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']


class LeadNotification(BaseModel):
    recipient = models.ForeignKey(
        Employee,
        related_name='lead_notifications',
        on_delete=models.CASCADE,
    )
    lead = models.ForeignKey(
        Lead,
        related_name='notifications',
        on_delete=models.CASCADE,
    )
    kind = models.CharField(
        max_length=32,
        choices=(
            (NOTIFICATION_ASSIGNED, 'Assigned'),
            (NOTIFICATION_FOLLOW_UP_DUE, 'Follow-up due'),
        ),
    )
    title = models.CharField(max_length=120)
    message = models.CharField(max_length=255)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['recipient', 'read_at'], name='lead_notification_read_idx'),
        ]
