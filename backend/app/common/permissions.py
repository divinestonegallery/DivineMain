from rest_framework.permissions import BasePermission


class IsStaffOrAdmin(BasePermission):
    """Allow only active local customers explicitly assigned a staff role."""

    message = "Administrator access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and getattr(user, "is_active", False)
            and getattr(user, "role", None) in {"staff", "admin"}
        )


class IsAdmin(BasePermission):
    """Restrict sensitive staff-management operations to administrators."""

    message = "Administrator role is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and getattr(user, "is_active", False)
            and getattr(user, "role", None) == "admin"
        )
