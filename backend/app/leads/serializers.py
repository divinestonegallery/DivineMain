from rest_framework import serializers

from app.leads.models import Lead, LeadActivity, LeadNote, LeadNotification


def employee_person(employee):
    if employee is None:
        return None
    return {
        'id': employee.id,
        'user_id': employee.user_id,
        'name': employee.name,
        'email': employee.email,
        'role': employee.role,
    }


def user_person(user):
    if user is None:
        return None
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': None,
    }


class LeadSerializer(serializers.ModelSerializer):
    assigned_to = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

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

    def get_assigned_to(self, lead):
        return employee_person(lead.assigned_to)

    def get_created_by(self, lead):
        if lead.created_by_employee_id:
            return employee_person(lead.created_by_employee)
        return user_person(lead.created_by)


class LeadNoteSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = LeadNote
        fields = ('id', 'body', 'author', 'created_at')

    def get_author(self, note):
        return employee_person(note.author)


class LeadActivitySerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

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

    def get_actor(self, activity):
        return employee_person(activity.actor)


class LeadNotificationSerializer(serializers.ModelSerializer):
    lead_uid = serializers.UUIDField(source='lead.uid', read_only=True)

    class Meta:
        model = LeadNotification
        fields = ('id', 'kind', 'title', 'message', 'lead_uid', 'read_at', 'created_at')
