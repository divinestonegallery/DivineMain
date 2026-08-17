from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.accounts.services.webhook_service import AccountWebhookService
import logging

logger = logging.getLogger(__name__)

import os
from django.conf import settings
from svix.webhooks import Webhook, WebhookVerificationError

class ClerkWebhookView(OpenAPIView):
    """
    Public webhook endpoint for Clerk to sync users.
    Verifies Svix headers.
    """
    def post(self, request):
        try:
            # Get the webhook secret from env
            webhook_secret = os.environ.get("CLERK_WEBHOOK_SECRET")
            if not webhook_secret:
                logger.error("CLERK_WEBHOOK_SECRET is not set in environment.")
                return get_response(ErrorResponse(message="Server misconfigured", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

            # Retrieve Svix headers
            svix_id = request.headers.get("svix-id")
            svix_timestamp = request.headers.get("svix-timestamp")
            svix_signature = request.headers.get("svix-signature")

            if not svix_id or not svix_timestamp or not svix_signature:
                return get_response(ErrorResponse(message="Missing Svix headers", status_code=status.HTTP_400_BAD_REQUEST))

            headers = {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            }

            # Verify the signature
            try:
                wh = Webhook(webhook_secret)
                # DRF request.body is the raw bytes
                wh.verify(request.body, headers)
            except WebhookVerificationError:
                return get_response(ErrorResponse(message="Invalid webhook signature", status_code=status.HTTP_400_BAD_REQUEST))

            # Process the payload
            payload = request.data
            error, data = AccountWebhookService.process_clerk_webhook(payload)
            
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            
            return get_response(SuccessResponse(data=data, message="Webhook processed successfully"))
        except Exception as e:
            logger.error(f"Error in ClerkWebhookView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
