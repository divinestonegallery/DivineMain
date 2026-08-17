from rest_framework import serializers
from app.products.models import Category

class CategoryCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image_url']
