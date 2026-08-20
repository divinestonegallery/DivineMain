from app.products.services.customer_service import (
    CategoryCustomerService,
    DietyCustomerService,
    MaterialCustomerService,
    ProductCustomerService,
)
from app.products.validators import ProductListValidator
from drf_spectacular.utils import extend_schema, extend_schema_view
from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class ProductListingView(OpenAPIView):
    @extend_schema(operation_id='products_list')
    def get(self, request):
        validator = ProductListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid product filters', err=validator.errors, status_code=400))
        error, data = ProductCustomerService.get_product_listing(validator.validated_data)
        return get_response(ErrorResponse(message=error, status_code=400)) if error else get_response(SuccessResponse(data=data, message='Products fetched successfully'))


class ProductDetailView(OpenAPIView):
    @extend_schema(operation_id='products_retrieve')
    def get(self, request, slug):
        error, data = ProductCustomerService.get_product_details(slug)
        return get_response(ErrorResponse(message=error, status_code=404)) if error else get_response(SuccessResponse(data=data, message='Product fetched successfully'))


class CustomerCategoryListView(OpenAPIView):
    def get(self, request):
        error, data = CategoryCustomerService.list_active()
        return get_response(SuccessResponse(data=data, message='Categories fetched successfully'))


class CustomerMaterialListView(OpenAPIView):
    def get(self, request):
        error, data = MaterialCustomerService.list_active()
        return get_response(SuccessResponse(data=data, message='Materials fetched successfully'))


class CustomerDietyListView(OpenAPIView):
    def get(self, request):
        error, data = DietyCustomerService.list_active()
        return get_response(SuccessResponse(data=data, message='Deities fetched successfully'))


@extend_schema_view(get=extend_schema(exclude=True))
class LegacyCustomerDietyListView(CustomerDietyListView):
    pass
