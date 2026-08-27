import logging
import traceback
from rest_framework import status

from app.products.services.customer_service import (
    CategoryCustomerService,
    DietyCustomerService,
    MaterialCustomerService,
    ProductCustomerService,
)
from app.products.validators import ProductListValidator
from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response

logger = logging.getLogger(__name__)


class ProductListingView(OpenAPIView):
    """View to list active catalogue products with filtering, sorting, and pagination."""

    def get(self, request):
        try:
            validator = ProductListValidator(data=request.query_params)
            if not validator.is_valid():
                return get_response(ErrorResponse(
                    message='Invalid product filters',
                    err=validator.errors,
                    status_code=status.HTTP_400_BAD_REQUEST,
                ))

            error, data = ProductCustomerService.list_active_products(validator.validated_data)
            if error:
                return get_response(ErrorResponse(
                    message=error,
                    status_code=status.HTTP_400_BAD_REQUEST,
                ))

            return get_response(SuccessResponse(
                message='Products fetched successfully',
                data=data,
                status_code=status.HTTP_200_OK,
            ))
        except Exception as exc:
            logger.error('ProductListingView.get error: %s', exc, exc_info=traceback.format_exc())
            return get_response(ErrorResponse(
                message='Failed to fetch products',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ))


class ProductDetailView(OpenAPIView):
    """View to retrieve full details of an active catalogue product by slug."""

    def get(self, request, slug):
        try:
            error, data = ProductCustomerService.get_product_details(slug)
            if error:
                return get_response(ErrorResponse(
                    message=error,
                    status_code=status.HTTP_404_NOT_FOUND,
                ))

            return get_response(SuccessResponse(
                message='Product fetched successfully',
                data=data,
                status_code=status.HTTP_200_OK,
            ))
        except Exception as exc:
            logger.error('ProductDetailView.get error: %s', exc, exc_info=traceback.format_exc())
            return get_response(ErrorResponse(
                message='Failed to fetch product details',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ))


class CustomerCategoryListView(OpenAPIView):
    """View to list active categories for the public catalogue."""

    def get(self, request):
        try:
            error, data = CategoryCustomerService.list_active_categories()
            if error:
                return get_response(ErrorResponse(
                    message=error,
                    status_code=status.HTTP_400_BAD_REQUEST,
                ))

            return get_response(SuccessResponse(
                message='Categories fetched successfully',
                data=data,
                status_code=status.HTTP_200_OK,
            ))
        except Exception as exc:
            logger.error('CustomerCategoryListView.get error: %s', exc, exc_info=traceback.format_exc())
            return get_response(ErrorResponse(
                message='Failed to fetch categories',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ))


class CustomerMaterialListView(OpenAPIView):
    """View to list active materials for the public catalogue."""

    def get(self, request):
        try:
            error, data = MaterialCustomerService.list_active_materials()
            if error:
                return get_response(ErrorResponse(
                    message=error,
                    status_code=status.HTTP_400_BAD_REQUEST,
                ))

            return get_response(SuccessResponse(
                message='Materials fetched successfully',
                data=data,
                status_code=status.HTTP_200_OK,
            ))
        except Exception as exc:
            logger.error('CustomerMaterialListView.get error: %s', exc, exc_info=traceback.format_exc())
            return get_response(ErrorResponse(
                message='Failed to fetch materials',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ))


class CustomerDietyListView(OpenAPIView):
    """View to list active deities for the public catalogue."""

    def get(self, request):
        try:
            error, data = DietyCustomerService.list_active_deities()
            if error:
                return get_response(ErrorResponse(
                    message=error,
                    status_code=status.HTTP_400_BAD_REQUEST,
                ))

            return get_response(SuccessResponse(
                message='Deities fetched successfully',
                data=data,
                status_code=status.HTTP_200_OK,
            ))
        except Exception as exc:
            logger.error('CustomerDietyListView.get error: %s', exc, exc_info=traceback.format_exc())
            return get_response(ErrorResponse(
                message='Failed to fetch deities',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ))
