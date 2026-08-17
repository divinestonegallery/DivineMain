from rest_framework import serializers
from app.contactus.models import ContactMessage, CustomizeRequest

class ContactMessageAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'

class CustomizeRequestAdminSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='user.name', read_only=True)
    customer_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = CustomizeRequest
        fields = '__all__'
