from rest_framework import serializers

from app.orders.models import Order, Payment


class PaymentCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('razorpay_order_id', 'amount', 'currency', 'status')


class OrderCustomerSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    product_uid = serializers.CharField(source='product.uid', read_only=True)
    payment = PaymentCustomerSerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            'uid',
            'product_name', 'product_slug', 'product_uid',
            'quantity', 'sales_mode',
            'unit_price', 'gst_rate', 'total_amount',
            'status',
            'note',
            'shipping_name', 'shipping_phone',
            'shipping_address_line1', 'shipping_address_line2',
            'shipping_city', 'shipping_state', 'shipping_pincode',
            'payment',
            'created_at', 'updated_at',
        )


class OrderCustomerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list endpoints."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)

    class Meta:
        model = Order
        fields = (
            'uid', 'product_name', 'product_slug',
            'quantity', 'total_amount', 'status', 'sales_mode',
            'created_at',
        )
