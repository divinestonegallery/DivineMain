from rest_framework import serializers
from app.faq.models import FAQ

class CustomerFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ('id', 'question', 'answer', 'category', 'display_order')
