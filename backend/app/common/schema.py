from drf_spectacular.extensions import OpenApiAuthenticationExtension


class ClerkAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'app.common.authentication.ClerkAuthentication'
    name = 'ClerkBearerAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
            'description': 'A valid Clerk session token.',
        }
