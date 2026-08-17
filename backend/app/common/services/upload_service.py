import io
import logging
import uuid
from datetime import timedelta

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings
from django.utils import timezone
from PIL import Image, UnidentifiedImageError

from app.common.repositories import UploadRepository

logger = logging.getLogger(__name__)


class UploadService:
    EXTENSIONS = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
    }
    FORMAT_TYPES = {
        'JPEG': 'image/jpeg',
        'PNG': 'image/png',
        'WEBP': 'image/webp',
    }

    @staticmethod
    def get_s3_client():
        return boto3.client(
            's3',
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(
                signature_version='s3v4',
                connect_timeout=5,
                read_timeout=15,
                retries={'max_attempts': 2, 'mode': 'standard'},
            ),
            region_name='auto',
        )

    @staticmethod
    def storage_configured():
        return UploadService.r2_client_configured() and bool(settings.R2_PUBLIC_BASE_URL)

    @staticmethod
    def r2_client_configured():
        return all((
            settings.R2_ENDPOINT,
            settings.R2_BUCKET_NAME,
            settings.R2_ACCESS_KEY_ID,
            settings.R2_SECRET_ACCESS_KEY,
        ))

    @staticmethod
    def create_presigned_upload(data, actor_id):
        if not UploadService.storage_configured():
            return 'Storage backend is not fully configured.', None
        content_type = data['content_type']
        file_size = data['file_size']
        if content_type not in settings.R2_ALLOWED_IMAGE_TYPES:
            return 'Unsupported image type.', None
        if file_size > settings.R2_MAX_IMAGE_BYTES:
            return f'Image must not exceed {settings.R2_MAX_IMAGE_BYTES} bytes.', None

        UploadService.cleanup_expired(limit=10)
        folder = 'product-images' if data['purpose'] == 'product_image' else 'customization-references'
        extension = UploadService.EXTENSIONS[content_type]
        object_key = f'{folder}/{uuid.uuid4().hex}.{extension}'
        expires_at = timezone.now() + timedelta(minutes=settings.R2_UPLOAD_SESSION_TTL_MINUTES)
        UploadRepository.create_session({
            'object_key': object_key,
            'purpose': data['purpose'],
            'expected_content_type': content_type,
            'expected_size': file_size,
            'expires_at': expires_at,
            'created_by_id': actor_id,
        })

        try:
            upload_url = UploadService.get_s3_client().generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': settings.R2_BUCKET_NAME,
                    'Key': object_key,
                    'ContentType': content_type,
                    'ContentLength': file_size,
                },
                ExpiresIn=settings.R2_UPLOAD_URL_TTL_SECONDS,
            )
        except Exception:
            logger.exception('R2 presigned URL generation failed')
            UploadRepository.mark_rejected(object_key)
            return 'Failed to generate upload URL.', None
        return None, {
            'method': 'PUT',
            'upload_url': upload_url,
            'object_key': object_key,
            'public_url': UploadService.public_url(object_key),
            'required_headers': {
                'Content-Type': content_type,
                'Content-Length': str(file_size),
            },
            'expires_in_seconds': settings.R2_UPLOAD_URL_TTL_SECONDS,
        }

    @staticmethod
    def inspect_image(object_key, session):
        try:
            client = UploadService.get_s3_client()
            head = client.head_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
            actual_size = int(head.get('ContentLength', 0))
            actual_type = (head.get('ContentType') or '').split(';', 1)[0].lower()
            if actual_size != session['expected_size']:
                return 'Uploaded file size does not match the signed request.', None
            if actual_size <= 0 or actual_size > settings.R2_MAX_IMAGE_BYTES:
                return 'Uploaded image size is outside the allowed range.', None
            if actual_type != session['expected_content_type'] or actual_type not in settings.R2_ALLOWED_IMAGE_TYPES:
                return 'Uploaded image type does not match the signed request.', None

            response = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
            raw = response['Body'].read(settings.R2_MAX_IMAGE_BYTES + 1)
            if len(raw) != actual_size:
                return 'Uploaded object could not be read completely.', None
            Image.MAX_IMAGE_PIXELS = settings.R2_MAX_IMAGE_WIDTH * settings.R2_MAX_IMAGE_HEIGHT
            with Image.open(io.BytesIO(raw)) as image:
                image.verify()
            with Image.open(io.BytesIO(raw)) as image:
                width, height = image.size
                detected_type = UploadService.FORMAT_TYPES.get(image.format)
            if detected_type != actual_type:
                return 'File contents do not match the declared image type.', None
            if not (settings.R2_MIN_IMAGE_WIDTH <= width <= settings.R2_MAX_IMAGE_WIDTH):
                return 'Image width is outside the allowed range.', None
            if not (settings.R2_MIN_IMAGE_HEIGHT <= height <= settings.R2_MAX_IMAGE_HEIGHT):
                return 'Image height is outside the allowed range.', None
            return None, {
                'content_type': actual_type,
                'file_size': actual_size,
                'width': width,
                'height': height,
            }
        except (ClientError, UnidentifiedImageError, Image.DecompressionBombError, OSError):
            logger.warning('R2 image validation failed for object key %s', object_key)
            return 'Uploaded object is missing or is not a valid image.', None

    @staticmethod
    def delete_object(object_key):
        if not object_key:
            return None
        try:
            UploadService.get_s3_client().delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=object_key,
            )
            return None
        except Exception:
            logger.exception('Unable to delete R2 object %s', object_key)
            return 'Unable to delete the stored image. Database record was preserved.'

    @staticmethod
    def cleanup_expired(limit=100):
        deleted = 0
        for object_key in UploadRepository.expired_pending_keys(limit=limit):
            if UploadService.delete_object(object_key) is None:
                UploadRepository.mark_deleted(object_key)
                deleted += 1
        return deleted

    @staticmethod
    def public_url(object_key):
        return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{object_key}" if settings.R2_PUBLIC_BASE_URL else None
