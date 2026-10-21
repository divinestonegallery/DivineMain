from rest_framework import serializers

from app.accounts.models import Customer
from app.leads.models import Lead, LeadActivity, LeadNote, LeadNotification


class LeadPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'name', 'email', 'role')


class LeadSerializer(serializers.ModelSerializer):
    assigned_to = LeadPersonSerializer(read_only=True)
    created_by = LeadPersonSerializer(read_only=True)

    class Meta:
        model = Lead
        fields = (
            'id',
            'uid',
            'name',
            'email',
            'phone',
            'city',
            'summary',
            'source',
            'touchpoint',
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'landing_path',
            'external_id',
            'status',
            'lost_reason',
            'assigned_to',
            'created_by',
            'follow_up_at',
            'follow_up_notified_at',
            'created_at',
            'updated_at',
        )


class LeadNoteSerializer(serializers.ModelSerializer):
    author = LeadPersonSerializer(read_only=True)

    class Meta:
        model = LeadNote
        fields = ('id', 'body', 'author', 'created_at')


class LeadActivitySerializer(serializers.ModelSerializer):
    actor = LeadPersonSerializer(read_only=True)

    class Meta:
        model = LeadActivity
        fields = (
            'id',
            'action',
            'field_name',
            'old_value',
            'new_value',
            'actor',
            'created_at',
        )


class LeadNotificationSerializer(serializers.ModelSerializer):
    lead_uid = serializers.UUIDField(source='lead.uid', read_only=True)

    class Meta:
        model = LeadNotification
        fields = ('id', 'kind', 'title', 'message', 'lead_uid', 'read_at', 'created_at')
