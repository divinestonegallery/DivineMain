from rest_framework import status
from drf_spectacular.utils import extend_schema, extend_schema_view

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


def invalid(validator, message='Invalid request'):
    return get_response(ErrorResponse(message=message, err=validator.errors, status_code=400))


def service_response(error, data, message, success_status=200):
    if error:
        code = 404 if 'not found' in str(error).lower() else 400
        return get_response(ErrorResponse(message=error, status_code=code))
    return get_response(SuccessResponse(data=data, message=message, status_code=success_status))


class AdminProductCreateView(AdminAPIView):
    @extend_schema(operation_id='admin_products_list')
    def get(self, request):
        validator = ProductListValidator(data=request.query_params)
        if not validator.is_valid():
            return invalid(validator, 'Invalid product filters')
        return service_response(*ProductAdminService.list_products(validator.validated_data), 'Products fetched successfully')

    def post(self, request):
        validator = ProductRequestValidator(data=request.data)
        if not validator.is_valid():
            return invalid(validator, 'Invalid product')
        return service_response(
            *ProductAdminService.create_product(validator.validated_data),
            'Product created successfully',
            status.HTTP_201_CREATED,
        )


class AdminProductDetailView(AdminAPIView):
    @extend_schema(operation_id='admin_products_retrieve')
    def get(self, request, product_id):
        return service_response(*ProductAdminService.get_product(product_id), 'Product fetched successfully')

    def patch(self, request, product_id):
        validator = ProductRequestValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return invalid(validator, 'Invalid product update')
        return service_response(*ProductAdminService.update_product(product_id, validator.validated_data), 'Product updated successfully')

    put = patch

    def delete(self, request, product_id):
        return service_response(*ProductAdminService.archive_product(product_id), 'Product archived successfully')


class AdminProductVariantListCreateView(AdminAPIView):
    def get(self, request, product_id):
        return service_response(*ProductVariantService.list_variants(product_id), 'Variants fetched successfully')

    def post(self, request, product_id):
        validator = ProductVariantValidator(data=request.data)
        if not validator.is_valid():
            return invalid(validator, 'Invalid variant')
        return service_response(
            *ProductVariantService.create_variant(product_id, validator.validated_data),
            'Variant created successfully',
            status.HTTP_201_CREATED,
        )


class AdminProductVariantDetailView(AdminAPIView):
    def patch(self, request, product_id, variant_id):
        validator = ProductVariantValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return invalid(validator, 'Invalid variant update')
        return service_response(*ProductVariantService.update_variant(product_id, variant_id, validator.validated_data), 'Variant updated successfully')

    put = patch

    def delete(self, request, product_id, variant_id):
        return service_response(*ProductVariantService.delete_variant(product_id, variant_id), 'Variant deleted successfully')


class AdminProductImageListCreateView(AdminAPIView):
    def get(self, request, product_id):
        return service_response(*ProductImageService.list_images(product_id), 'Images fetched successfully')

    def post(self, request, product_id):
        validator = ProductImageFinalizeValidator(data=request.data)
        if not validator.is_valid():
            return invalid(validator, 'Invalid product image')
        return service_response(
            *ProductImageService.attach_image(product_id, validator.validated_data, request.user.id),
            'Product image attached successfully',
            status.HTTP_201_CREATED,
        )


class AdminProductImageDetailView(AdminAPIView):
    def patch(self, request, product_id, image_id):
        validator = ProductImageUpdateValidator(data=request.data)
        if not validator.is_valid():
            return invalid(validator, 'Invalid image update')
        return service_response(*ProductImageService.update_image(product_id, image_id, validator.validated_data), 'Image updated successfully')

    def delete(self, request, product_id, image_id):
        return service_response(*ProductImageService.delete_image(product_id, image_id), 'Image deleted successfully')


class AdminProductImageReorderView(AdminAPIView):
    def post(self, request, product_id):
        validator = ProductImageReorderValidator(data=request.data)
        if not validator.is_valid():
            return invalid(validator, 'Invalid image order')
        return service_response(*ProductImageService.reorder_images(product_id, validator.validated_data['image_ids']), 'Images reordered successfully')


class BaseTaxonomyListCreateView(AdminAPIView):
    service = None
    label = 'Item'

    def get(self, request):
        return service_response(*self.service.list_items(), f'{self.label}s fetched successfully')

    def post(self, request):
        validator = self.validator_class(data=request.data)
        if not validator.is_valid():
            return invalid(validator, f'Invalid {self.label.lower()}')
        return service_response(*self.service.create(validator.validated_data), f'{self.label} created', status.HTTP_201_CREATED)


class BaseTaxonomyDetailView(AdminAPIView):
    service = None
    label = 'Item'
    id_kwarg = ''

    def _id(self, kwargs):
        return kwargs[self.id_kwarg]

    def get(self, request, **kwargs):
        return service_response(*self.service.get(self._id(kwargs)), f'{self.label} fetched successfully')

    def patch(self, request, **kwargs):
        validator = self.validator_class(data=request.data, partial=True)
        if not validator.is_valid():
            return invalid(validator, f'Invalid {self.label.lower()} update')
        return service_response(*self.service.update(self._id(kwargs), validator.validated_data), f'{self.label} updated successfully')

    put = patch

    def delete(self, request, **kwargs):
        return service_response(*self.service.delete(self._id(kwargs)), f'{self.label} deactivated successfully')


@extend_schema_view(get=extend_schema(operation_id='admin_categories_list'))
class AdminCategoryListCreateView(BaseTaxonomyListCreateView):
    service = CategoryAdminService
    validator_class = CategoryRequestValidator
    label = 'Category'


@extend_schema_view(get=extend_schema(operation_id='admin_categories_retrieve'))
class AdminCategoryDetailView(BaseTaxonomyDetailView):
    service = CategoryAdminService
    validator_class = CategoryRequestValidator
    label = 'Category'
    id_kwarg = 'category_id'


@extend_schema_view(get=extend_schema(operation_id='admin_materials_list'))
class AdminMaterialListCreateView(BaseTaxonomyListCreateView):
    service = MaterialAdminService
    validator_class = MaterialRequestValidator
    label = 'Material'


@extend_schema_view(get=extend_schema(operation_id='admin_materials_retrieve'))
class AdminMaterialDetailView(BaseTaxonomyDetailView):
    service = MaterialAdminService
    validator_class = MaterialRequestValidator
    label = 'Material'
    id_kwarg = 'material_id'


@extend_schema_view(get=extend_schema(operation_id='admin_deities_list'))
class AdminDietyListCreateView(BaseTaxonomyListCreateView):
    service = DietyAdminService
    validator_class = DietyRequestValidator
    label = 'Deity'


@extend_schema_view(get=extend_schema(operation_id='admin_deities_retrieve'))
class AdminDietyDetailView(BaseTaxonomyDetailView):
    service = DietyAdminService
    validator_class = DietyRequestValidator
    label = 'Deity'
    id_kwarg = 'diety_id'

