from rest_framework import status

from app.orders.services.customer_service import OrderCustomerService
from app.orders.validators import PlaceOrderValidator, PaymentVerifyValidator
from framework.core.base_apiviews import AuthenticatedAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class CustomerOrderListCreateView(AuthenticatedAPIView):
    def get(self, request):
        error, data = OrderCustomerService.list_my_orders(request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Orders fetched successfully'))

    def post(self, request):
        validator = PlaceOrderValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid order data', err=validator.errors, status_code=400))
        error, data = OrderCustomerService.place_order(request.user.id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Order placed successfully', status_code=status.HTTP_201_CREATED))


class CustomerOrderDetailView(AuthenticatedAPIView):
    def get(self, request, uid):
        error, data = OrderCustomerService.get_my_order(request.user.id, uid)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='Order fetched successfully'))


class CustomerOrderCancelView(AuthenticatedAPIView):
    def post(self, request, uid):
        error, data = OrderCustomerService.cancel_my_order(request.user.id, uid)
        if error:
            return get_response(ErrorResponse(
                message=error,
                status_code=404 if 'not found' in error.lower() else 400,
            ))
        return get_response(SuccessResponse(data=data, message='Order cancelled successfully'))


class PaymentVerifyView(AuthenticatedAPIView):
    def post(self, request):
        validator = PaymentVerifyValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid payment data', err=validator.errors, status_code=400))
        error, data = OrderCustomerService.verify_payment(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Payment verified successfully'))
