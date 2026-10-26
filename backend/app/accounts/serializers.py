from rest_framework import serializers

from app.accounts.models import Employee, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'clerk_user_id', 'email', 'name', 'phone',
            'is_active', 'created_at', 'updated_at',
        )


class StaffSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)

    class Meta:
        model = Employee
        fields = (
            'id', 'clerk_user_id', 'email', 'name', 'phone', 'role',
            'is_active', 'created_at', 'updated_at',
        )
