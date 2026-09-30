from rest_framework import status

class SuccessResponse(object):
    def __init__(self, data=None, message="Success", status_code=status.HTTP_200_OK):
        self.message = message
        self.success = True
        self.status_code = status_code
        self.data = data

    @property
    def dict(self):
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data
        }


class ErrorResponse(object):
    def __init__(self, message="Error occurred", status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, err=None, code=None, retryable=None):
        self.message = message
        self.success = False
        self.status_code = status_code
        self.data = err # Often validation errors or None
        self.code = code
        self.retryable = retryable

    @property
    def dict(self):
        payload = {
            "success": self.success,
            "message": self.message,
            "data": self.data
        }
        if self.code:
            payload["error"] = {
                "code": self.code,
                "message": self.message,
                "retryable": bool(self.retryable),
            }
        return payload


class ServerErrorResponse(object):
    def __init__(self, message="Server Error", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, err=None):
        self.message = message
        self.success = False
        self.status_code = status_code
        self.data = err

    @property
    def dict(self):
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data
        }
