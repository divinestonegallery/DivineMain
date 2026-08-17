from rest_framework import serializers


class ReviewCreateValidator(serializers.Serializer):
    product = serializers.IntegerField(min_value=1)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=3, max_length=3000)


class ReviewAdminUpdateValidator(serializers.Serializer):
    status = serializers.ChoiceField(choices=('pending', 'approved', 'rejected'))


class ReviewListValidator(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    status = serializers.ChoiceField(choices=('pending', 'approved', 'rejected'), required=False)
