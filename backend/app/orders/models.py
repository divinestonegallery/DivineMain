import secrets
import string

from django.db import models

from app.common.models import BaseModel


def _generate_order_uid(size=8):
    chars = string.digits + string.ascii_uppercase
    return 'DSG-ORD-' + ''.join(secrets.choice(chars) for _ in range(size))


class Order(BaseModel):
    class Status(models.TextChoices):
        PENDING_PAYMENT = 'pending_payment', 'Pending Payment'
        CONFIRMED = 'confirmed', 'Confirmed'
        PROCESSING = 'processing', 'Processing'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    class SalesMode(models.TextChoices):
        DIRECT_PURCHASE = 'direct_purchase', 'Direct Purchase'
        BUY_AND_QUOTE = 'buy_and_quote', 'Buy and Quote'
        QUOTE_ONLY = 'quote_only', 'Quote Only'

    uid = models.CharField(max_length=20, unique=True, blank=True)
    product = models.ForeignKey(
        'products.Product', on_delete=models.PROTECT, related_name='orders',
    )
    customer = models.ForeignKey(
        'accounts.Customer', on_delete=models.PROTECT, related_name='orders',
    )
    quantity = models.PositiveIntegerField(default=1)

    # Sales mode snapshot — preserved so future mode changes don't affect old orders
    sales_mode = models.CharField(max_length=30, choices=SalesMode.choices)

    # Price snapshots at order time — so price edits don't retroactively change orders
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING_PAYMENT,
    )
    note = models.TextField(blank=True, null=True)

    # Shipping address
    shipping_name = models.CharField(max_length=255)
    shipping_phone = models.CharField(max_length=20)
    shipping_address_line1 = models.CharField(max_length=512)
    shipping_address_line2 = models.CharField(max_length=512, blank=True, null=True)
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_pincode = models.CharField(max_length=10)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.uid or str(self.id)

    def save(self, *args, **kwargs):
        if not self.uid:
            self.uid = _generate_order_uid()
        super().save(*args, **kwargs)


class Payment(BaseModel):
    class Status(models.TextChoices):
        CREATED = 'created', 'Created'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    razorpay_order_id = models.CharField(max_length=255)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=512, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CREATED,
    )

    def __str__(self):
        return f'{self.order_id} — {self.status}'
