from rest_framework import serializers
from app.products.models import Product, ProductImage, Category, Material, Diety

class ProductAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['slug', 'uid']

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

class CategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['slug']

class MaterialAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ['slug']

class DietyAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diety
        fields = '__all__'
        read_only_fields = ['slug']
