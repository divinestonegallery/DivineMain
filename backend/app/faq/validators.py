from rest_framework import serializers


class FAQValidator(serializers.Serializer):
    question = serializers.CharField(min_length=5, max_length=3000, required=False)
    answer = serializers.CharField(min_length=5, max_length=10000, required=False)
    category = serializers.CharField(max_length=255, allow_blank=True, allow_null=True, required=False)
    display_order = serializers.IntegerField(min_value=0, required=False)
    is_active = serializers.BooleanField(required=False)
