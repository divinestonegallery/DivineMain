from rest_framework import serializers
from app.reviews.models import Review

class CustomerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ('id', 'product', 'rating', 'comment', 'created_at')
        read_only_fields = ('id', 'created_at')
