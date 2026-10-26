from app.accounts.models import Employee
from app.leads.repositories.group_repository import GroupRepository


def ensure_default_sales_membership(employee_id):
    """Give an active staff employee the default Sales group. Admins are left unchanged."""
    employee = Employee.objects.filter(id=employee_id, is_active=True).first()
    if not employee or employee.role != Employee.Role.STAFF:
        return
    GroupRepository.ensure_sales_membership(employee.id)
