import logging
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from app.orders.models import Order, Payment
from app.orders.serializers.admin import OrderAdminSerializer, OrderAdminListSerializer
from app.orders.serializers.customer import OrderCustomerSerializer, OrderCustomerListSerializer

logger = logging.getLogger(__name__)


def _compute_total(unit_price, gst_rate, quantity):
    """Return total inclusive of GST: unit_price * (1 + gst_rate/100) * quantity."""
    price = Decimal(str(unit_price))
    gst = Decimal(str(gst_rate or 0))
    qty = Decimal(str(quantity))
    total = (price * (1 + gst / 100) * qty).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return total


class OrderRepository:

    # ── Customer: create ────────────────────────────────────────────────────

    @staticmethod
    def create_order(customer_id, product, data):
        """
        Create an Order + a placeholder Payment row inside a transaction.
        Returns (error_str | None, order_instance | None).
        """
        unit_price = product.selling_price
        gst_rate = product.gst or Decimal('0')
        quantity = data.get('quantity', 1)
        total = _compute_total(unit_price, gst_rate, quantity)

        try:
            with transaction.atomic():
                order = Order.objects.create(
                    product=product,
                    customer_id=customer_id,
                    quantity=quantity,
                    sales_mode=Order.SalesMode.DIRECT_PURCHASE,
                    unit_price=unit_price,
                    gst_rate=gst_rate,
                    total_amount=total,
                    note=data.get('note', ''),
                    shipping_name=data['shipping_name'],
                    shipping_phone=data['shipping_phone'],
                    shipping_address_line1=data['shipping_address_line1'],
                    shipping_address_line2=data.get('shipping_address_line2', ''),
                    shipping_city=data['shipping_city'],
                    shipping_state=data['shipping_state'],
                    shipping_pincode=data['shipping_pincode'],
                )
                Payment.objects.create(
                    order=order,
                    razorpay_order_id='',  # populated by service after Razorpay call
                    amount=total,
                    currency='INR',
                )
        except Exception as exc:
            logger.error('OrderRepository.create_order failed: %s', exc, exc_info=True)
            return 'Failed to create order.', None
        return None, order

    @staticmethod
    def attach_razorpay_order_id(order, razorpay_order_id):
        """Store the Razorpay order ID on the Payment row."""
        order.payment.razorpay_order_id = razorpay_order_id
        order.payment.save(update_fields=['razorpay_order_id', 'updated_at'])

    # ── Customer: payment verify ─────────────────────────────────────────────

    @staticmethod
    def confirm_payment(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        """
        Mark payment as paid and order as confirmed.
        Returns (error | None, serialized_order | None).
        """
        payment = (
            Payment.objects
            .select_related('order__product', 'order__customer')
            .filter(razorpay_order_id=razorpay_order_id)
            .first()
        )
        if not payment:
            return 'Payment not found.', None
        if payment.status == Payment.Status.PAID:
            return None, OrderCustomerSerializer(payment.order).data
        try:
            with transaction.atomic():
                payment.razorpay_payment_id = razorpay_payment_id
                payment.razorpay_signature = razorpay_signature
                payment.status = Payment.Status.PAID
                payment.save(update_fields=[
                    'razorpay_payment_id', 'razorpay_signature', 'status', 'updated_at',
                ])
                payment.order.status = Order.Status.CONFIRMED
                payment.order.save(update_fields=['status', 'updated_at'])
        except Exception as exc:
            logger.error('OrderRepository.confirm_payment failed: %s', exc, exc_info=True)
            return 'Failed to confirm payment.', None
        return None, OrderCustomerSerializer(payment.order).data

    @staticmethod
    def fail_payment(razorpay_order_id):
        """Mark payment row as failed (signature mismatch)."""
        Payment.objects.filter(
            razorpay_order_id=razorpay_order_id, status=Payment.Status.CREATED,
        ).update(status=Payment.Status.FAILED)

    # ── Customer: list & detail ──────────────────────────────────────────────

    @staticmethod
    def get_customer_order_list(customer_id):
        orders = (
            Order.objects
            .select_related('product')
            .filter(customer_id=customer_id)
            .order_by('-created_at')
        )
        return OrderCustomerListSerializer(orders, many=True).data

    @staticmethod
    def get_customer_order_by_uid(customer_id, uid):
        order = (
            Order.objects
            .select_related('product', 'payment')
            .filter(customer_id=customer_id, uid=uid)
            .first()
        )
        return OrderCustomerSerializer(order).data if order else None

    # ── Customer: cancel ─────────────────────────────────────────────────────

    # Allowed statuses from which a customer can self-cancel (direct_purchase)
    CUSTOMER_CANCELLABLE = {
        Order.Status.PENDING_PAYMENT,
        Order.Status.CONFIRMED,
        Order.Status.PROCESSING,
        Order.Status.SHIPPED,
    }

    @staticmethod
    def cancel_order_by_customer(customer_id, uid):
        """
        Customer self-cancel. Allowed until 'shipped' for direct_purchase.
        Returns (error | None, serialized_order | None).
        """
        order = Order.objects.filter(customer_id=customer_id, uid=uid).first()
        if not order:
            return 'Order not found.', None
        if order.status not in OrderRepository.CUSTOMER_CANCELLABLE:
            return f'Orders cannot be cancelled once {order.status}.', None
        order.status = Order.Status.CANCELLED
        order.save(update_fields=['status', 'updated_at'])
        return None, OrderCustomerSerializer(order).data

    # ── Admin: list & detail ─────────────────────────────────────────────────

    @staticmethod
    def get_admin_order_list(params):
        queryset = (
            Order.objects
            .select_related('product', 'customer')
            .order_by('-created_at')
        )
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        if params.get('search'):
            q = params['search']
            queryset = queryset.filter(uid__icontains=q)
        total = queryset.count()
        page = params.get('page', 1)
        page_size = params.get('page_size', 20)
        start = (page - 1) * page_size
        items = OrderAdminListSerializer(queryset[start:start + page_size], many=True).data
        return {
            'items': items,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_items': total,
                'total_pages': max(1, (total + page_size - 1) // page_size),
            },
        }

    @staticmethod
    def get_admin_order_by_uid(uid):
        order = (
            Order.objects
            .select_related('product', 'customer', 'payment')
            .filter(uid=uid)
            .first()
        )
        return OrderAdminSerializer(order).data if order else None

    # ── Admin: status update ─────────────────────────────────────────────────

    ADMIN_TRANSITIONS = {
        Order.Status.CONFIRMED: {Order.Status.PROCESSING, Order.Status.CANCELLED},
        Order.Status.PROCESSING: {Order.Status.SHIPPED, Order.Status.CANCELLED},
        Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.CANCELLED},
        Order.Status.DELIVERED: set(),
        Order.Status.CANCELLED: set(),
        Order.Status.PENDING_PAYMENT: {Order.Status.CANCELLED},
    }

    @staticmethod
    def update_order_status(uid, target_status):
        order = Order.objects.filter(uid=uid).first()
        if not order:
            return 'Order not found.', None
        allowed = OrderRepository.ADMIN_TRANSITIONS.get(order.status, set())
        if target_status not in allowed:
            return (
                f'Cannot move order from {order.status} to {target_status}.',
                None,
            )
        order.status = target_status
        order.save(update_fields=['status', 'updated_at'])
        return None, OrderAdminSerializer(order).data
