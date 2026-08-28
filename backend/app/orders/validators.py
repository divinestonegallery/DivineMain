from rest_framework import serializers


class PlaceOrderValidator(serializers.Serializer):
    product_slug = serializers.SlugField()
    quantity = serializers.IntegerField(min_value=1, max_value=50, default=1)
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    # Shipping address
    shipping_name = serializers.CharField(max_length=255)
    shipping_phone = serializers.RegexField(
        regex=r'^\+?[0-9]{7,15}$',
        error_messages={'invalid': 'Enter a valid phone number (7–15 digits, optional + prefix).'},
    )
    shipping_address_line1 = serializers.CharField(max_length=512)
    shipping_address_line2 = serializers.CharField(
        max_length=512, required=False, allow_blank=True, default='',
    )
    shipping_city = serializers.CharField(max_length=100)
    shipping_state = serializers.CharField(max_length=100)
    shipping_pincode = serializers.RegexField(
        regex=r'^[0-9]{6}$',
        error_messages={'invalid': 'Enter a valid 6-digit Indian pincode.'},
    )


class PaymentVerifyValidator(serializers.Serializer):
    razorpay_order_id = serializers.CharField(max_length=255)
    razorpay_payment_id = serializers.CharField(max_length=255)
    razorpay_signature = serializers.CharField(max_length=512)


class AdminOrderStatusValidator(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        'processing', 'shipped', 'delivered', 'cancelled',
    ])
