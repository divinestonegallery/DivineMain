from app.accounts.repositories.customer_repository import CustomerRepository
from app.leads.services.provisioning import ensure_default_sales_membership


class UserAdminService:
    @staticmethod
    def list_users(params):
        return None, CustomerRepository.list_users(
            params['page'], params['page_size'], params.get('search', ''),
        )

    @staticmethod
    def promote(user_id, role):
        error, row = CustomerRepository.promote_to_employee(user_id, role)
        if error:
            return error, None
        if row.get('employee_role') == 'staff':
            ensure_default_sales_membership(row['employee_id'])
        return None, row
