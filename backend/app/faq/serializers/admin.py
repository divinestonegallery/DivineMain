from rest_framework import serializers
from app.faq.models import FAQ

class AdminFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
