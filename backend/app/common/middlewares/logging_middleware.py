import logging
import uuid
import json
from threading import local
import time
#import elasticapm

_locals = local()

logger = logging.getLogger(__name__)


class LoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self.process_request(request)
        start_time = time.time()
        response = self.get_response(request)
        end_time = time.time()
        _locals.response_time = end_time - start_time
        _locals.response_code = response.status_code
        return response

    def process_request(self, request):
        try:
            body = json.loads(request.body.decode('utf-8'))
        except:
            body = ""
        _locals.tracker_id = str(uuid.uuid4())
        _locals.request_path = request.path
        _locals.request_body = body
        _locals.get_params = request.GET
        _locals.request_method = request.method
        _locals.authorization_token = request.headers.get('Authorization')
        # _locals.transaction_id = elasticapm.get_transaction_id()
        # _locals.trace_id = elasticapm.get_trace_id()
        # _locals.span_id = elasticapm.get_span_id()
