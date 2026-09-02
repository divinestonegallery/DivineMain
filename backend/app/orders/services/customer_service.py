import hashlib
import hmac
import logging
import os

from app.orders.repositories.order_repository import OrderRepository
from app.orders.serializers.customer import OrderCustomerSerializer
from app.products.models import Product
from app.products.enums import ProductStatus, SalesMode

logger = logging.getLogger(__name__)


def _razorpay_client():
    """Return a lazily-initialised Razorpay client. Raises on missing keys."""
    import razorpay  # imported late so the app works without razorpay during tests
    key_id = os.environ.get('RAZORPAY_KEY_ID', '')
    key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
    return razorpay.Client(auth=(key_id, key_secret)), key_secret


class OrderCustomerService:

    @staticmethod
    def place_order(customer_id, data):
        """
        Full place-order flow for direct_purchase products:
          1. Validate product
          2. Create Order + blank Payment row
          3. Create Razorpay order
          4. Attach Razorpay order ID to Payment
          5. Return checkout payload (razorpay_order_id, amount, key_id)
        """
        product = (
            Product.objects
            .filter(slug=data['product_slug'], status=ProductStatus.ACTIVE.value, is_active=True)
            .first()
        )
        if not product:
            return 'Product not found or unavailable.', None

        # Only direct_purchase allowed for now
        if product.sales_mode != SalesMode.DIRECT_PURCHASE.value:
            return 'This product is not available for direct purchase.', None

        if not product.selling_price:
            return 'This product does not have a price set. Please contact us for a quote.', None

        error, order = OrderRepository.create_order(customer_id, product, data)
        if error:
            return error, None

        # Create Razorpay order (amount in paise)
        try:
            client, _ = _razorpay_client()
            rz_order = client.order.create({
                'amount': int(order.total_amount * 100),
                'currency': 'INR',
                'receipt': order.uid,
            })
            razorpay_order_id = rz_order['id']
        except Exception as exc:
            logger.error('Razorpay order creation failed: %s', exc, exc_info=True)
            # Roll back the order so the customer can retry
            order.delete()
            return 'Payment gateway error. Please try again.', None

        OrderRepository.attach_razorpay_order_id(order, razorpay_order_id)

        return None, {
            'order_uid': order.uid,
            'razorpay_order_id': razorpay_order_id,
            'amount': int(order.total_amount * 100),  # paise, for Razorpay SDK
            'currency': 'INR',
            'key_id': os.environ.get('RAZORPAY_KEY_ID', ''),
        }

    @staticmethod
    def verify_payment(data):
        """
        Verify Razorpay HMAC-SHA256 signature, then confirm order.
        signature = HMAC-SHA256(razorpay_order_id + '|' + razorpay_payment_id, key_secret)
        """
        razorpay_order_id = data['razorpay_order_id']
        razorpay_payment_id = data['razorpay_payment_id']
        razorpay_signature = data['razorpay_signature']

        try:
            _, key_secret = _razorpay_client()
            message = f'{razorpay_order_id}|{razorpay_payment_id}'
            expected = hmac.new(
                key_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256,
            ).hexdigest()
        except Exception as exc:
            logger.error('Razorpay signature verification setup failed: %s', exc, exc_info=True)
            return 'Payment verification failed.', None

        if not hmac.compare_digest(expected, razorpay_signature):
            OrderRepository.fail_payment(razorpay_order_id)
            return 'Payment signature is invalid.', None

        return OrderRepository.confirm_payment(
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
        )

    @staticmethod
    def list_my_orders(customer_id):
        return None, OrderRepository.get_customer_order_list(customer_id)

    @staticmethod
    def get_my_order(customer_id, uid):
        order = OrderRepository.get_customer_order_by_uid(customer_id, uid)
        return (None, order) if order else ('Order not found.', None)

    @staticmethod
    def cancel_my_order(customer_id, uid):
        return OrderRepository.cancel_order_by_customer(customer_id, uid)
