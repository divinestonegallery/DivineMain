import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings
import uuid
import logging

logger = logging.getLogger(__name__)

class UploadService:
    @staticmethod
    def get_s3_client():
        return boto3.client(
            's3',
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto'  # R2 requires region to be 'auto' or 'us-east-1' etc. typically 'auto'
        )

    @staticmethod
    def generate_presigned_url(filename, file_type, folder="uploads"):
        """
        Generates a presigned URL for direct frontend upload to R2.
        """
        if not settings.R2_ENDPOINT or not settings.R2_BUCKET_NAME:
            return "Storage backend not configured", None

        # Generate a unique object key to prevent overwriting
        extension = filename.split('.')[-1] if '.' in filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{extension}"
        object_key = f"{folder}/{unique_filename}"

        s3_client = UploadService.get_s3_client()
        
        try:
            presigned_url = s3_client.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': settings.R2_BUCKET_NAME,
                    'Key': object_key,
                    'ContentType': file_type
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            
            # The final public URL the image will be available at
            public_url = f"{settings.R2_PUBLIC_BASE_URL}/{object_key}" if settings.R2_PUBLIC_BASE_URL else None
            
            data = {
                "upload_url": presigned_url,
                "object_key": object_key,
                "public_url": public_url
            }
            return None, data
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return "Failed to generate upload URL", None
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return str(e), None
