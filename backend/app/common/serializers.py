from rest_framework import serializers

from app.common.models import APIErrorLog, StaffAuditLog, UploadSession


class UploadSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadSession
        fields = (
            'id', 'object_key', 'purpose', 'expected_content_type', 'expected_size',
            'status', 'expires_at', 'attached_at', 'created_at',
        )


class StaffAuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True)

    class Meta:
        model = StaffAuditLog
        fields = (
            'id', 'actor_email', 'request_id', 'method', 'path', 'status_code',
            'ip_address', 'created_at',
        )


class APIErrorLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True)

    class Meta:
        model = APIErrorLog
        fields = (
            'id', 'actor_email', 'request_id', 'method', 'path', 'status_code',
            'error_type', 'message', 'ip_address', 'created_at',
        )
