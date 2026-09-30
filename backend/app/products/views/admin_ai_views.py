from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response
from app.products.services.ai_service import AIService, AIServiceError
from app.products.validators import ProductGenerateDraftValidator
from app.products.models import Category, Material, Diety

class AdminProductGenerateDraftView(AdminAPIView):
    def post(self, request):
        validator = ProductGenerateDraftValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='Invalid request',
                err=validator.errors,
                status_code=400,
                code='VALIDATION_ERROR',
                retryable=False,
            ))
            
        data = validator.validated_data
        
        category_name = None
        if data.get('category'):
            try:
                category_name = Category.objects.get(id=data['category']).name
            except Category.DoesNotExist:
                pass
                
        material_name = None
        if data.get('material'):
            try:
                material_name = Material.objects.get(id=data['material']).name
            except Material.DoesNotExist:
                pass
                
        deity_name = None
        if data.get('deity'):
            try:
                deity_name = Diety.objects.get(id=data['deity']).name
            except Diety.DoesNotExist:
                pass
                
        try:
            _, generated_data = AIService.generate_product_draft(
                name=data.get('name'),
                category_name=category_name,
                deity_name=deity_name,
                material_name=material_name,
                paragraph=data.get('paragraph'),
                images=data.get('images', [])
            )
        except AIServiceError as error:
            return get_response(ErrorResponse(
                message=error.public_message,
                status_code=error.status_code,
                code=error.code,
                retryable=error.retryable,
            ))
            
        return get_response(SuccessResponse(message='Draft generated successfully', data=generated_data))
