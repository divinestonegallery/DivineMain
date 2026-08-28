from decimal import Decimal
import hashlib
import hmac
from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework.test import APIClient

from app.accounts.models import Customer
from app.common.token_service import TokenService
from app.orders.models import Order, Payment
from app.products.models import Category, Diety, Material, Product


class OrderWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Customer setup
        self.customer = Customer.objects.create(
            clerk_user_id='user_cust_123',
            email='customer@example.com',
            name='Test Customer',
            role=Customer.Role.CUSTOMER,
            is_active=True,
        )
        token = TokenService.generate_access_token({
            'id': self.customer.id,
            'clerk_user_id': self.customer.clerk_user_id,
            'email': self.customer.email,
            'role': self.customer.role,
        })
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Admin customer setup
        self.admin_customer = Customer.objects.create(
            clerk_user_id='user_admin_123',
            email='admin@example.com',
            name='Admin User',
            role=Customer.Role.ADMIN,
            is_active=True,
        )
        self.admin_token = TokenService.generate_access_token({
            'id': self.admin_customer.id,
            'clerk_user_id': self.admin_customer.clerk_user_id,
            'email': self.admin_customer.email,
            'role': self.admin_customer.role,
        })

        # Product taxonomy and product setup
        self.category = Category.objects.create(name='Murti', slug='murti')
        self.material = Material.objects.create(name='Marble', slug='marble')
        self.deity = Diety.objects.create(name='Ganesha', slug='ganesha')

        self.product = Product.objects.create(
            category=self.category,
            material=self.material,
            diety=self.deity,
            name='White Marble Ganesha',
            slug='white-marble-ganesha',
            sales_mode=Product.SalesMode.DIRECT_PURCHASE,
            selling_price=Decimal('10000.00'),
            gst=Decimal('18.00'),
            status=Product.Status.ACTIVE,
            is_active=True,
        )

        self.valid_order_payload = {
            'product_slug': self.product.slug,
            'quantity': 1,
            'note': 'Handle with care',
            'shipping_name': 'Test Customer',
            'shipping_phone': '+919876543210',
            'shipping_address_line1': '123 Temple Road',
            'shipping_city': 'Jaipur',
            'shipping_state': 'Rajasthan',
            'shipping_pincode': '302001',
        }

    @patch('app.orders.services.customer_service._razorpay_client')
    def test_place_order_success(self, mock_rz_client):
        mock_client = MagicMock()
        mock_client.order.create.return_value = {'id': 'order_rzp_mock_123'}
        mock_rz_client.return_value = (mock_client, 'dummy_secret')

        response = self.client.post('/api/v1/orders', self.valid_order_payload, format='json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['razorpay_order_id'], 'order_rzp_mock_123')
        self.assertTrue(data['data']['order_uid'].startswith('DSG-ORD-'))

        # Check Order DB record
        order = Order.objects.get(uid=data['data']['order_uid'])
        self.assertEqual(order.status, Order.Status.PENDING_PAYMENT)
        self.assertEqual(order.total_amount, Decimal('11800.00'))  # 10000 + 18% GST
        self.assertEqual(order.payment.razorpay_order_id, 'order_rzp_mock_123')

    @patch('app.orders.services.customer_service._razorpay_client')
    def test_verify_payment_success(self, mock_rz_client):
        mock_client = MagicMock()
        mock_client.order.create.return_value = {'id': 'order_rzp_mock_456'}
        secret = 'test_secret_key'
        mock_rz_client.return_value = (mock_client, secret)

        # Place order
        res = self.client.post('/api/v1/orders', self.valid_order_payload, format='json')
        self.assertEqual(res.status_code, 201)

        # Compute valid HMAC signature
        rz_order_id = 'order_rzp_mock_456'
        rz_payment_id = 'pay_mock_789'
        signature = hmac.new(
            secret.encode('utf-8'),
            f'{rz_order_id}|{rz_payment_id}'.encode('utf-8'),
            hashlib.sha256,
        ).hexdigest()

        verify_payload = {
            'razorpay_order_id': rz_order_id,
            'razorpay_payment_id': rz_payment_id,
            'razorpay_signature': signature,
        }
        verify_res = self.client.post('/api/v1/orders/payment/verify', verify_payload, format='json')
        self.assertEqual(verify_res.status_code, 200)

        # Verify DB state
        order = Order.objects.get(payment__razorpay_order_id=rz_order_id)
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertEqual(order.payment.status, Payment.Status.PAID)

    @patch('app.orders.services.customer_service._razorpay_client')
    def test_customer_cancel_order(self, mock_rz_client):
        mock_client = MagicMock()
        mock_client.order.create.return_value = {'id': 'order_rzp_cancel_1'}
        mock_rz_client.return_value = (mock_client, 'secret')

        res = self.client.post('/api/v1/orders', self.valid_order_payload, format='json')
        order_uid = res.json()['data']['order_uid']

        # Cancel while pending_payment
        cancel_res = self.client.post(f'/api/v1/orders/{order_uid}/cancel')
        self.assertEqual(cancel_res.status_code, 200)
        order = Order.objects.get(uid=order_uid)
        self.assertEqual(order.status, Order.Status.CANCELLED)

    def test_admin_order_flow(self):
        # Create an order directly in DB
        order = Order.objects.create(
            product=self.product,
            customer=self.customer,
            quantity=1,
            sales_mode=Order.SalesMode.DIRECT_PURCHASE,
            unit_price=Decimal('10000.00'),
            gst_rate=Decimal('18.00'),
            total_amount=Decimal('11800.00'),
            status=Order.Status.CONFIRMED,
            shipping_name='Customer',
            shipping_phone='+919876543210',
            shipping_address_line1='Street 1',
            shipping_city='Jaipur',
            shipping_state='Rajasthan',
            shipping_pincode='302001',
        )

        admin_client = APIClient()
        admin_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')

        # List orders
        list_res = admin_client.get('/api/admin/orders')
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()['data']['items']), 1)

        # Update status confirmed -> processing
        patch_res = admin_client.patch(f'/api/admin/orders/{order.uid}', {'status': 'processing'}, format='json')
        self.assertEqual(patch_res.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PROCESSING)
