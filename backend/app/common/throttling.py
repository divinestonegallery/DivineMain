import hashlib

from rest_framework.settings import api_settings
from rest_framework.throttling import BaseThrottle, SimpleRateThrottle

from app.common.repositories import RateLimitRepository


class PersistentScopedRateThrottle(BaseThrottle):
    """Database-backed scoped throttling shared by every application worker."""

    scope_attr = "throttle_scope"

    def __init__(self):
        self.duration = None

    def allow_request(self, request, view):
        scope = getattr(view, self.scope_attr, None)
        if not scope:
            return True

        rate = api_settings.DEFAULT_THROTTLE_RATES.get(scope)
        if not rate:
            return True
        limit, duration = SimpleRateThrottle.parse_rate(self, rate)
        if limit is None or duration is None:
            return True

        if request.user and request.user.is_authenticated:
            identity = f"user:{request.user.pk}"
        else:
            identity = f"ip:{self.get_ident(request)}"
        identity_hash = hashlib.sha256(identity.encode("utf-8")).hexdigest()
        allowed, wait_seconds = RateLimitRepository.consume(
            scope,
            identity_hash,
            limit,
            duration,
        )
        self.duration = wait_seconds
        return allowed

    def wait(self):
        return self.duration
