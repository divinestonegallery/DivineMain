from rest_framework import serializers
from app.contactus.models import ContactMessage, CustomizeRequest

class ContactMessageCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'phone', 'message']

class CustomizeRequestCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomizeRequest
        fields = [
            'name', 'email', 'phone', 'city', 'pincode', 
            'approximate_height', 'preferred_material', 
            'description', 'reference_image'
        ]
