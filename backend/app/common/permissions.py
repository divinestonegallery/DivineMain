from rest_framework.permissions import BasePermission

from app.accounts.models import Employee


class IsStaffOrAdmin(BasePermission):
    """Allow an active employee with a staff or admin role."""

    message = "Administrator access is required."

    def has_permission(self, request, view):
        employee = request.user
        return bool(
            isinstance(employee, Employee)
            and employee.is_authenticated
            and employee.is_active
            and employee.user.is_active
            and employee.role in {Employee.Role.STAFF, Employee.Role.ADMIN}
        )


class IsAdmin(BasePermission):
    """Restrict sensitive staff-management operations to administrators."""

    message = "Administrator role is required."

    def has_permission(self, request, view):
        employee = request.user
        return bool(
            isinstance(employee, Employee)
            and employee.is_authenticated
            and employee.is_active
            and employee.user.is_active
            and employee.role == Employee.Role.ADMIN
        )
