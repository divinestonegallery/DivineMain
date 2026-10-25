from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response
from app.products.services.ai_service import AIService, ProductDraftGenerationError
from app.products.validators import ProductGenerateDraftValidator
from app.products.models import Category, Material, Diety

class AdminProductGenerateDraftView(AdminAPIView):
    throttle_scope = 'product_generation'

    def post(self, request):
        validator = ProductGenerateDraftValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid request', err=validator.errors, status_code=400))

        data = validator.validated_data

        category_name = None
        if data.get('category'):
            category_name = Category.objects.filter(
                id=data['category'], is_active=True
            ).values_list('name', flat=True).first()
            if not category_name:
                return get_response(ErrorResponse(
                    message='Invalid or inactive category.', status_code=400
                ))

        material_name = None
        if data.get('material'):
            material_name = Material.objects.filter(
                id=data['material'], is_active=True
            ).values_list('name', flat=True).first()
            if not material_name:
                return get_response(ErrorResponse(
                    message='Invalid or inactive material.', status_code=400
                ))

        deity_name = None
        if data.get('deity'):
            deity_name = Diety.objects.filter(
                id=data['deity'], is_active=True
            ).values_list('name', flat=True).first()
            if not deity_name:
                return get_response(ErrorResponse(
                    message='Invalid or inactive deity.', status_code=400
                ))

        try:
            generated_data = AIService.generate_product_draft(
                name=data.get('name'),
                category_name=category_name,
                deity_name=deity_name,
                material_name=material_name,
                paragraph=data.get('paragraph'),
                images=data.get('images', []),
                keywords=data.get('keywords'),
            )
        except ProductDraftGenerationError as error:
            return get_response(ErrorResponse(
                message=error.message, status_code=error.status_code
            ))

        generated_data.update({
            'category': data.get('category'),
            'material': data.get('material'),
            'deity': data.get('deity'),
        })
        return get_response(SuccessResponse(message='Draft generated successfully', data=generated_data))
