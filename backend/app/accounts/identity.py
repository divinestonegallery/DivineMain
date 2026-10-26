from app.accounts.models import Employee

CONSUMER_AUDIENCE = 'consumer'
ADMIN_AUDIENCE = 'admin'


def acting_user_id(principal):
    """User primary key for a consumer user or for the user behind an employee."""
    if isinstance(principal, Employee):
        return principal.user_id
    return principal.id
