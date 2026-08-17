from rest_framework import serializers


class GlobalSearchValidator(serializers.Serializer):
    q = serializers.CharField(max_length=255, required=False, allow_blank=True, trim_whitespace=True)
