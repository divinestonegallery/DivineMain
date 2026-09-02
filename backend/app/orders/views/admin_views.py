from app.orders.services.admin_service import OrderAdminService
from app.orders.validators import AdminOrderStatusValidator
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class AdminOrderListView(AdminAPIView):
    def get(self, request):
        params = {
            'page': int(request.query_params.get('page', 1)),
            'page_size': int(request.query_params.get('page_size', 20)),
            'status': request.query_params.get('status'),
            'search': request.query_params.get('search'),
        }
        error, data = OrderAdminService.list_all_orders(params)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Orders fetched successfully'))


class AdminOrderDetailView(AdminAPIView):
    def get(self, request, uid):
        error, data = OrderAdminService.get_order_details_by_uid(uid)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='Order details fetched successfully'))

    def patch(self, request, uid):
        validator = AdminOrderStatusValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid status update', err=validator.errors, status_code=400))
        error, data = OrderAdminService.update_order_status(uid, validator.validated_data['status'])
        if error:
            code = 404 if 'not found' in error.lower() else 400
            return get_response(ErrorResponse(message=error, status_code=code))
        return get_response(SuccessResponse(data=data, message='Order status updated successfully'))

    put = patch
