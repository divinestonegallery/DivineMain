from rest_framework import serializers
from app.reviews.models import Review

class ReviewAdminSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'product_name', 'customer_name', 'rating', 'comment', 'status', 'is_approved', 'created_at', 'updated_at']
