import base64
import json
import logging
import time

from django.conf import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    def __init__(self, code, message, status_code, retryable=False):
        super().__init__(message)
        self.code = code
        self.public_message = message
        self.status_code = status_code
        self.retryable = retryable


class AIService:
    MAX_RATE_LIMIT_ATTEMPTS = 3
    MAX_RETRY_DELAY_SECONDS = 10

    @staticmethod
    def _provider_status(error):
        for attribute in ('status_code', 'code'):
            value = getattr(error, attribute, None)
            if callable(value):
                try:
                    value = value()
                except Exception:
                    continue
            try:
                return int(value)
            except (TypeError, ValueError):
                continue
        return None

    @staticmethod
    def _is_permanent_quota_error(error_text):
        return 'quota' in error_text and any(
            marker in error_text
            for marker in ('exceeded', 'free_tier', 'billing', 'quota id', 'limit:')
        )

    @classmethod
    def _is_rate_limit_error(cls, error, error_text):
        return (
            cls._provider_status(error) == 429
            or 'resource_exhausted' in error_text
            or 'rate limit' in error_text
            or 'too many requests' in error_text
        )

    @classmethod
    def _retry_delay(cls, error, attempt):
        delay = getattr(error, 'retry_delay', None) or getattr(error, 'retry_after', None)
        if hasattr(delay, 'total_seconds'):
            delay = delay.total_seconds()
        if delay is None:
            response = getattr(error, 'response', None)
            headers = getattr(response, 'headers', {}) or {}
            delay = headers.get('Retry-After')
        try:
            delay = float(delay) if delay is not None else 2 ** attempt
        except (TypeError, ValueError):
            delay = 2 ** attempt
        return min(max(delay, 0), cls.MAX_RETRY_DELAY_SECONDS)

    @staticmethod
    def generate_product_draft(name, category_name, deity_name, material_name, paragraph, images):
        if not settings.GEMINI_API_KEY:
            raise AIServiceError(
                'AI_CONFIGURATION_ERROR',
                'AI generation is not configured on the server.',
                503,
            )
            
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        prompt = f"""
You are an expert e-commerce copywriter and product manager.
Your task is to generate draft product details based on the provided information and images.
Return ONLY valid JSON.

Product Name: {name or 'Not provided'}
Category: {category_name or 'Not provided'}
Deity/Subcategory: {deity_name or 'Not provided'}
Material: {material_name or 'Not provided'}
Description Paragraph: {paragraph or 'Not provided'}

Based on this, and the images if provided, generate a JSON object with the following keys exactly:
{{
  "name": "string (the product name, improved if necessary but keeping the core meaning)",
  "short_description": "string (1-2 sentences summarizing the product)",
  "description": "string (detailed description, multiple paragraphs if suitable. Do not invent exact dimensions, weight, stone origin, warranty, or stock quantity unless provided)",
  "seo_title": "string (SEO optimized title under 60 chars)",
  "seo_description": "string (SEO optimized description under 160 chars)",
  "keywords": ["string", "string"] (list of relevant keyword tags)
}}
"""
        try:
            model_name = settings.GEMINI_MODEL
            model = genai.GenerativeModel(model_name)
            contents = [prompt]
            
            for img in images:
                if img.get('data') and img.get('mime_type'):
                    contents.append({
                        "mime_type": img['mime_type'],
                        "data": base64.b64decode(img['data'])
                    })
                
            for attempt in range(AIService.MAX_RATE_LIMIT_ATTEMPTS):
                try:
                    logger.info('AI generation started provider=gemini model=%s', model_name)
                    response = model.generate_content(
                        contents,
                        generation_config={'response_mime_type': 'application/json'},
                    )
                    data = json.loads(response.text)
                    logger.info('AI generation succeeded provider=gemini model=%s', model_name)
                    return None, data
                except Exception as error:
                    error_text = str(error).lower()
                    if AIService._is_permanent_quota_error(error_text):
                        raise AIServiceError(
                            'AI_QUOTA_EXCEEDED',
                            'AI generation quota has been exceeded for this project. Please try again later or use a project with available Gemini API quota.',
                            429,
                        ) from None

                    if AIService._is_rate_limit_error(error, error_text):
                        if attempt + 1 < AIService.MAX_RATE_LIMIT_ATTEMPTS:
                            delay = AIService._retry_delay(error, attempt)
                            logger.warning(
                                'AI generation rate limited provider=gemini model=%s retry_attempt=%s retry_delay_seconds=%s',
                                model_name,
                                attempt + 1,
                                delay,
                            )
                            time.sleep(delay)
                            continue
                        raise AIServiceError(
                            'AI_RATE_LIMITED',
                            'AI generation is temporarily rate limited. Please try again shortly.',
                            429,
                            retryable=True,
                        ) from None

                    status_code = AIService._provider_status(error)
                    if status_code in (401, 403):
                        raise AIServiceError(
                            'AI_CONFIGURATION_ERROR',
                            'AI generation is not available because of a server configuration problem.',
                            503,
                        ) from None
                    if status_code is not None and status_code >= 500:
                        raise AIServiceError(
                            'AI_UNAVAILABLE',
                            'AI generation is temporarily unavailable. Please try again.',
                            503,
                            retryable=True,
                        ) from None
                    if isinstance(error, (json.JSONDecodeError, AttributeError)):
                        raise AIServiceError(
                            'AI_INVALID_RESPONSE',
                            'AI generation returned an invalid response. Please try again.',
                            502,
                        ) from None
                    raise AIServiceError(
                        'AI_GENERATION_FAILED',
                        'AI generation could not be completed.',
                        500,
                    ) from None
        except AIServiceError as error:
            logger.warning(
                'AI generation failed provider=gemini model=%s error_code=%s retryable=%s',
                settings.GEMINI_MODEL,
                error.code,
                error.retryable,
            )
            raise
        except (ValueError, TypeError) as error:
            logger.warning(
                'AI generation input processing failed provider=gemini error_type=%s',
                error.__class__.__name__,
            )
            raise AIServiceError(
                'AI_INVALID_INPUT',
                'The supplied image data is invalid. Please upload the images again.',
                400,
            ) from None
        except Exception as error:
            status_code = AIService._provider_status(error)
            logger.warning(
                'AI provider initialization failed provider=gemini error_type=%s',
                error.__class__.__name__,
            )
            if status_code is not None and status_code >= 500:
                raise AIServiceError(
                    'AI_UNAVAILABLE',
                    'AI generation is temporarily unavailable. Please try again.',
                    503,
                    retryable=True,
                ) from None
            raise AIServiceError(
                'AI_GENERATION_FAILED',
                'AI generation could not be completed.',
                500,
            ) from None
