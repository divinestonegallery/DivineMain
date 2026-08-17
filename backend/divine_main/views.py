from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import SuccessResponse
from framework.utils import get_response
from rest_framework import status

class HealthCheckView(OpenAPIView):
    def get(self, request):
        data = {"status": "ok"}
        return get_response(SuccessResponse(
            data=data,
            message="V1 Backend is successfully configured and running!",
            status_code=status.HTTP_200_OK
        ))
