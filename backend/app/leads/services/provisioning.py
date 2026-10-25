from app.accounts.repositories.customer_repository import CustomerRepository
from app.leads.repositories.group_repository import GroupRepository


def ensure_default_sales_membership(customer_id):
    """Give an active staff account the default Sales group. Customers and admins are left unchanged."""
    customer = CustomerRepository.get_staff(customer_id)
    if not customer:
        return
    if customer.get('role') != 'staff' or not customer.get('is_active'):
        return
    GroupRepository.ensure_sales_membership(customer['id'])
