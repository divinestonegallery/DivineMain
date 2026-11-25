from app.products.enums import ProductStatus, SalesMode
from decimal import Decimal
import hashlib
import hmac
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from app.accounts.identity import ADMIN_AUDIENCE, CONSUMER_AUDIENCE
from app.accounts.models import Employee, User
from app.common.token_service import TokenService
from app.integrations.resend.client import send_template_email
from app.orders.models import Order, Payment
from app.products.models import Category, Diety, Material, Product


class OrderReceiptClientTests(SimpleTestCase):
    @override_settings(
        RESEND_API_KEY='re_test',
        RESEND_FROM_EMAIL='Divine Stone Gallery <hello@mail.divinestonegallery.com>',
    )
    @patch('resend.Emails.send', return_value={'id': 'email_1'})
    def test_send_passes_template_variables_and_idempotency_key(self, mock_send):
        email_id = send_template_email(
            to='customer@example.com',
            template_id='5f87d138-4409-42e7-8f9b-6e94acd8c16c',
            variables={
                'CUSTOMER_NAME': 'Test Customer',
                'ORDER_NUMBER': 'DSG-ORD-1',
                'PRODUCT_NAME': 'White Marble Ganesha',
                'QUANTITY': 1,
                'TOTAL_AMOUNT': '₹11,800.00',
                'SHIPPING_ADDRESS': '123 Temple Road, Jaipur, Rajasthan 302001',
            },
            idempotency_key='order-receipt/DSG-ORD-1',
        )

        self.assertEqual(email_id, 'email_1')
        params, options = mock_send.call_args.args
        self.assertEqual(options['idempotency_key'], 'order-receipt/DSG-ORD-1')
        self.assertEqual(params['template']['id'], '5f87d138-4409-42e7-8f9b-6e94acd8c16c')
        self.assertEqual(params['template']['variables']['ORDER_NUMBER'], 'DSG-ORD-1')
        self.assertEqual(params['template']['variables']['QUANTITY'], 1)
        self.assertNotIn('html', params)

    @override_settings(RESEND_API_KEY='re_test', RESEND_FROM_EMAIL='Gallery <hello@mail.example.com>')
    @patch('app.integrations.resend.client.time.sleep')
    @patch('resend.Emails.send')
    def test_retries_server_errors_and_not_other_client_errors(self, mock_send, _sleep):
        class ProviderError(Exception):
            def __init__(self, status_code):
                super().__init__('provider error')
                self.status_code = status_code

        mock_send.side_effect = ProviderError(400)
        self.assertIsNone(send_template_email(
            to='customer@example.com',
            template_id='template',
            variables={'ORDER_NUMBER': 'DSG-ORD-1'},
            idempotency_key='order-receipt/DSG-ORD-1',
        ))
        self.assertEqual(mock_send.call_count, 1)

        mock_send.reset_mock()
        mock_send.side_effect = [ProviderError(503), {'id': 'email_2'}]
        self.assertEqual(send_template_email(
            to='customer@example.com',
            template_id='template',
            variables={'ORDER_NUMBER': 'DSG-ORD-1'},
            idempotency_key='order-receipt/DSG-ORD-1',
        ), 'email_2')
        self.assertEqual(mock_send.call_count, 2)


class OrderWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Customer setup
        self.customer = User.objects.create(
            clerk_user_id='user_cust_123',
            email='customer@example.com',
            name='Test Customer',
            is_active=True,
        )
        token = TokenService.generate_access_token({
            'id': self.customer.id,
            'clerk_user_id': self.customer.clerk_user_id,
            'email': self.customer.email,
            'role': 'customer',
        }, audience=CONSUMER_AUDIENCE)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        admin_user = User.objects.create(email='admin@example.com', name='Admin User')
        self.admin_customer = Employee.objects.create(
            user=admin_user,
            clerk_user_id='user_admin_123',
            role='admin',
            is_active=True,
        )
        self.admin_token = TokenService.generate_access_token({
            'id': self.admin_customer.user_id,
            'clerk_user_id': self.admin_customer.clerk_user_id,
            'email': self.admin_customer.email,
            'role': self.admin_customer.role,
        }, audience=ADMIN_AUDIENCE)

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
            sales_mode=SalesMode.DIRECT_PURCHASE.value,
            selling_price=Decimal('10000.00'),
            gst=Decimal('18.00'),
            status=ProductStatus.ACTIVE.value,
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

    @patch('app.orders.services.customer_service.send_order_receipt')
    @patch('app.orders.services.customer_service._razorpay_client')
    def test_verify_payment_success(self, mock_rz_client, mock_receipt):
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
        mock_receipt.assert_called_once()
        self.assertEqual(mock_receipt.call_args.args[0].uid, order.uid)

        verify_again = self.client.post('/api/v1/orders/payment/verify', verify_payload, format='json')
        self.assertEqual(verify_again.status_code, 200)
        mock_receipt.assert_called_once()

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

    @override_settings(ROOT_URLCONF='divine_main.urls_admin')
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
