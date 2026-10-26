from rest_framework import serializers

from app.orders.models import Order, Payment


class PaymentAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            'razorpay_order_id', 'razorpay_payment_id',
            'amount', 'currency', 'status', 'created_at',
        )


class OrderAdminSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    payment = PaymentAdminSerializer(read_only=True)

    def get_customer_name(self, order):
        return order.customer.name if order.customer_id else ''

    def get_customer_email(self, order):
        return order.customer.email if order.customer_id else ''

    class Meta:
        model = Order
        fields = (
            'id', 'uid',
            'product_name', 'product_slug',
            'customer_name', 'customer_email',
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


class OrderAdminListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list endpoints — no nested payment."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_email = serializers.SerializerMethodField()

    def get_customer_email(self, order):
        return order.customer.email if order.customer_id else ''

    class Meta:
        model = Order
        fields = (
            'id', 'uid',
            'product_name', 'customer_email',
            'quantity', 'total_amount',
            'status', 'sales_mode',
            'created_at',
        )

