from rest_framework import serializers

from app.accounts.models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id', 'clerk_user_id', 'email', 'name', 'phone', 'role',
            'is_active', 'created_at', 'updated_at',
        )


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'clerk_user_id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at')
