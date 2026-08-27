from rest_framework import status

from app.products.services.admin_service import (
    CategoryAdminService,
    DietyAdminService,
    MaterialAdminService,
    ProductAdminService,
    ProductImageService,
    ProductVariantService,
)
from app.products.validators import (
    CategoryRequestValidator,
    DietyRequestValidator,
    MaterialRequestValidator,
    ProductImageFinalizeValidator,
    ProductImageReorderValidator,
    ProductImageUpdateValidator,
    ProductListValidator,
    ProductRequestValidator,
    ProductVariantValidator,
)
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class AdminProductCreateView(AdminAPIView):
    def get(self, request):
        validator = ProductListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid product filters', err=validator.errors, status_code=400))
        error, data = ProductAdminService.list_products(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Products fetched successfully', data=data))

    def post(self, request):
        validator = ProductRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid product', err=validator.errors, status_code=400))
        error, data = ProductAdminService.create_product(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Product created successfully', data=data, status_code=status.HTTP_201_CREATED))


class AdminProductDetailView(AdminAPIView):
    def get(self, request, product_id):
        error, data = ProductAdminService.get_product(product_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Product fetched successfully', data=data))

    def patch(self, request, product_id):
        validator = ProductRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid product update', err=validator.errors, status_code=400))
        error, data = ProductAdminService.update_product(product_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Product updated successfully', data=data))

    put = patch

    def delete(self, request, product_id):
        error, data = ProductAdminService.archive_product(product_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Product archived successfully', data=data))


class AdminProductVariantListCreateView(AdminAPIView):
    def get(self, request, product_id):
        error, data = ProductVariantService.list_variants(product_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Variants fetched successfully', data=data))

    def post(self, request, product_id):
        validator = ProductVariantValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid variant', err=validator.errors, status_code=400))
        error, data = ProductVariantService.create_variant(product_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Variant created successfully', data=data, status_code=status.HTTP_201_CREATED))


class AdminProductVariantDetailView(AdminAPIView):
    def patch(self, request, product_id, variant_id):
        validator = ProductVariantValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid variant update', err=validator.errors, status_code=400))
        error, data = ProductVariantService.update_variant(product_id, variant_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Variant updated successfully', data=data))

    put = patch

    def delete(self, request, product_id, variant_id):
        error, data = ProductVariantService.delete_variant(product_id, variant_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Variant deleted successfully', data=data))


class AdminProductImageListCreateView(AdminAPIView):
    def get(self, request, product_id):
        error, data = ProductImageService.list_images(product_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Images fetched successfully', data=data))

    def post(self, request, product_id):
        validator = ProductImageFinalizeValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid product image', err=validator.errors, status_code=400))
        error, data = ProductImageService.attach_image(product_id, validator.validated_data, request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Product image attached successfully', data=data, status_code=status.HTTP_201_CREATED))


class AdminProductImageDetailView(AdminAPIView):
    def patch(self, request, product_id, image_id):
        validator = ProductImageUpdateValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid image update', err=validator.errors, status_code=400))
        error, data = ProductImageService.update_image(product_id, image_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Image updated successfully', data=data))

    def delete(self, request, product_id, image_id):
        error, data = ProductImageService.delete_image(product_id, image_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Image deleted successfully', data=data))


class AdminProductImageReorderView(AdminAPIView):
    def post(self, request, product_id):
        validator = ProductImageReorderValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid image order', err=validator.errors, status_code=400))
        error, data = ProductImageService.reorder_images(product_id, validator.validated_data['image_ids'])
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Images reordered successfully', data=data))


class AdminCategoryListCreateView(AdminAPIView):
    def get(self, request):
        error, data = CategoryAdminService.get_all_categories()
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Categories fetched successfully', data=data))

    def post(self, request):
        validator = CategoryRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid category', err=validator.errors, status_code=400))
        error, data = CategoryAdminService.create_category(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Category created', data=data, status_code=status.HTTP_201_CREATED))


class AdminCategoryDetailView(AdminAPIView):
    def get(self, request, category_id):
        error, data = CategoryAdminService.get_category_by_id(category_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Category fetched successfully', data=data))

    def patch(self, request, category_id):
        validator = CategoryRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid category update', err=validator.errors, status_code=400))
        error, data = CategoryAdminService.update_category(category_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Category updated successfully', data=data))

    put = patch

    def delete(self, request, category_id):
        error, data = CategoryAdminService.deactivate_category(category_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Category deactivated successfully', data=data))


class AdminMaterialListCreateView(AdminAPIView):
    def get(self, request):
        error, data = MaterialAdminService.get_all_materials()
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Materials fetched successfully', data=data))

    def post(self, request):
        validator = MaterialRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid material', err=validator.errors, status_code=400))
        error, data = MaterialAdminService.create_material(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Material created', data=data, status_code=status.HTTP_201_CREATED))


class AdminMaterialDetailView(AdminAPIView):
    def get(self, request, material_id):
        error, data = MaterialAdminService.get_material_by_id(material_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Material fetched successfully', data=data))

    def patch(self, request, material_id):
        validator = MaterialRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid material update', err=validator.errors, status_code=400))
        error, data = MaterialAdminService.update_material(material_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Material updated successfully', data=data))

    put = patch

    def delete(self, request, material_id):
        error, data = MaterialAdminService.deactivate_material(material_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Material deactivated successfully', data=data))


class AdminDietyListCreateView(AdminAPIView):
    def get(self, request):
        error, data = DietyAdminService.get_all_deities()
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Deities fetched successfully', data=data))

    def post(self, request):
        validator = DietyRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid deity', err=validator.errors, status_code=400))
        error, data = DietyAdminService.create_deity(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Deity created', data=data, status_code=status.HTTP_201_CREATED))


class AdminDietyDetailView(AdminAPIView):
    def get(self, request, diety_id):
        error, data = DietyAdminService.get_deity_by_id(diety_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Deity fetched successfully', data=data))

    def patch(self, request, diety_id):
        validator = DietyRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid deity update', err=validator.errors, status_code=400))
        error, data = DietyAdminService.update_deity(diety_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(message='Deity updated successfully', data=data))

    put = patch

    def delete(self, request, diety_id):
        error, data = DietyAdminService.deactivate_deity(diety_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(message='Deity deactivated successfully', data=data))
