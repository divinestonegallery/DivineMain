import logging

from django.conf import settings

from app.integrations.resend.client import send_template_email

logger = logging.getLogger(__name__)


def send_order_receipt(order):
    """Send the published order-receipt template. Failures are logged only.

    Payment is already confirmed by the time this runs, so an email problem
    must not change the order outcome. The idempotency key is the order, so a
    retry of the same receipt does not send a second copy within a day.
    """
    recipient = order.customer.email if order.customer_id and order.customer else ''
    recipient = (recipient or '').strip()
    if not recipient:
        logger.error('Order receipt skipped because the order has no customer email order=%s', order.uid)
        return None

    email_id = send_template_email(
        to=recipient,
        template_id=settings.RESEND_ORDER_RECEIPT_TEMPLATE_ID,
        variables=receipt_variables(order),
        idempotency_key=f'order-receipt/{order.uid}',
    )
    if email_id:
        logger.info('Order receipt sent order=%s email_id=%s', order.uid, email_id)
    return email_id


def receipt_variables(order):
    address = [
        order.shipping_address_line1,
        order.shipping_address_line2,
        f'{order.shipping_city}, {order.shipping_state} {order.shipping_pincode}',
    ]
    customer_name = (order.shipping_name or '').strip()
    if not customer_name and order.customer_id and order.customer:
        customer_name = (order.customer.name or '').strip()
    currency = order.payment.currency if getattr(order, 'payment', None) else 'INR'
    return {
        'CUSTOMER_NAME': customer_name or 'there',
        'ORDER_NUMBER': order.uid,
        'PRODUCT_NAME': order.product.name,
        'QUANTITY': order.quantity,
        'TOTAL_AMOUNT': _money(order.total_amount, currency),
        'SHIPPING_ADDRESS': ', '.join(part.strip() for part in address if part and part.strip()),
    }


def _money(amount, currency):
    formatted = f'{amount:,.2f}'
    if currency == 'INR':
        return f'₹{formatted}'
    return f'{currency} {formatted}'
