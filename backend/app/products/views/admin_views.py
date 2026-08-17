from framework.core.base_apiviews import ServiceAuthenticatedAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.products.services.admin_service import ProductAdminService
import logging

logger = logging.getLogger(__name__)

class AdminProductCreateView(ServiceAuthenticatedAPIView):
    def get(self, request):
        try:
            error, data = ProductAdminService.list_products()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Products fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminProductCreateView (GET): {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def post(self, request):
        try:
            error, data = ProductAdminService.create_product(request.data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Product created successfully", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in AdminProductCreateView: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

class AdminProductDetailView(ServiceAuthenticatedAPIView):
    def get(self, request, product_id):
        try:
            error, data = ProductAdminService.get_product(product_id)
            if error:
                status_code = status.HTTP_404_NOT_FOUND if error == "Product not found" else status.HTTP_400_BAD_REQUEST
                return get_response(ErrorResponse(message=error, status_code=status_code))
            return get_response(SuccessResponse(data=data, message="Product details fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminProductDetailView (GET): {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def put(self, request, product_id):
        try:
            error, data = ProductAdminService.update_product(product_id, request.data)
            if error:
                status_code = status.HTTP_404_NOT_FOUND if error == "Product not found" else status.HTTP_400_BAD_REQUEST
                return get_response(ErrorResponse(message=error, status_code=status_code))
            return get_response(SuccessResponse(data=data, message="Product updated successfully"))
        except Exception as e:
            logger.error(f"Error in AdminProductDetailView (PUT): {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def delete(self, request, product_id):
        try:
            error, data = ProductAdminService.soft_delete_product(product_id)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
            return get_response(SuccessResponse(data=data, message="Product soft-deleted successfully"))
        except Exception as e:
            logger.error(f"Error in AdminProductDetailView (DELETE): {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    patch = put

# --- Category Admin Views ---
from app.products.services.admin_service import CategoryAdminService, MaterialAdminService, DietyAdminService
from app.products.validators import CategoryRequestValidator, MaterialRequestValidator, DietyRequestValidator

class AdminCategoryListCreateView(ServiceAuthenticatedAPIView):
    def get(self, request):
        error, data = CategoryAdminService.list_categories()
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
        return get_response(SuccessResponse(data=data, message="Categories fetched successfully"))

    def post(self, request):
        validator = CategoryRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message=str(validator.errors), status_code=status.HTTP_400_BAD_REQUEST))
        error, data = CategoryAdminService.create_category(validator.validated_data)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
        return get_response(SuccessResponse(data=data, message="Category created", status_code=status.HTTP_201_CREATED))

class AdminCategoryDetailView(ServiceAuthenticatedAPIView):
    def get(self, request, category_id):
        error, data = CategoryAdminService.get_category(category_id)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Category fetched successfully"))

    def put(self, request, category_id):
        validator = CategoryRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message=str(validator.errors), status_code=status.HTTP_400_BAD_REQUEST))
        error, data = CategoryAdminService.update_category(category_id, validator.validated_data)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Category updated successfully"))

    def delete(self, request, category_id):
        error, data = CategoryAdminService.soft_delete_category(category_id)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Category deleted successfully"))
    patch = put

# --- Material Admin Views ---
class AdminMaterialListCreateView(ServiceAuthenticatedAPIView):
    def get(self, request):
        error, data = MaterialAdminService.list_materials()
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
        return get_response(SuccessResponse(data=data, message="Materials fetched successfully"))

    def post(self, request):
        validator = MaterialRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message=str(validator.errors), status_code=status.HTTP_400_BAD_REQUEST))
        error, data = MaterialAdminService.create_material(validator.validated_data)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
        return get_response(SuccessResponse(data=data, message="Material created", status_code=status.HTTP_201_CREATED))

class AdminMaterialDetailView(ServiceAuthenticatedAPIView):
    def get(self, request, material_id):
        error, data = MaterialAdminService.get_material(material_id)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Material fetched successfully"))

    def put(self, request, material_id):
        validator = MaterialRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message=str(validator.errors), status_code=status.HTTP_400_BAD_REQUEST))
        error, data = MaterialAdminService.update_material(material_id, validator.validated_data)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Material updated successfully"))

    def delete(self, request, material_id):
        error, data = MaterialAdminService.soft_delete_material(material_id)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Material deleted successfully"))
    patch = put

# --- Diety Admin Views ---
class AdminDietyListCreateView(ServiceAuthenticatedAPIView):
    def get(self, request):
        error, data = DietyAdminService.list_dieties()
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
        return get_response(SuccessResponse(data=data, message="Dieties fetched successfully"))

    def post(self, request):
        validator = DietyRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message=str(validator.errors), status_code=status.HTTP_400_BAD_REQUEST))
        error, data = DietyAdminService.create_diety(validator.validated_data)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
        return get_response(SuccessResponse(data=data, message="Diety created", status_code=status.HTTP_201_CREATED))

class AdminDietyDetailView(ServiceAuthenticatedAPIView):
    def get(self, request, diety_id):
        error, data = DietyAdminService.get_diety(diety_id)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Diety fetched successfully"))

    def put(self, request, diety_id):
        validator = DietyRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message=str(validator.errors), status_code=status.HTTP_400_BAD_REQUEST))
        error, data = DietyAdminService.update_diety(diety_id, validator.validated_data)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Diety updated successfully"))

    def delete(self, request, diety_id):
        error, data = DietyAdminService.soft_delete_diety(diety_id)
        if error: return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
        return get_response(SuccessResponse(data=data, message="Diety deleted successfully"))
    patch = put
