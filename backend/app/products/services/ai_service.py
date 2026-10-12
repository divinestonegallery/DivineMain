import base64
import json
import logging
from django.conf import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def generate_product_draft(name, category_name, deity_name, material_name, paragraph, images):
        if not settings.GEMINI_API_KEY:
            return "Server is missing AI configuration.", None
            
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
            model = genai.GenerativeModel('gemini-3.8-flash')
            contents = [prompt]
            
            for img in images:
                if img.get('data') and img.get('mime_type'):
                    contents.append({
                        "mime_type": img['mime_type'],
                        "data": base64.b64decode(img['data'])
                    })
                
            response = model.generate_content(contents, generation_config={"response_mime_type": "application/json"})
            text = response.text
            
            data = json.loads(text)
            return None, data
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            return "Failed to generate product content with AI.", None
