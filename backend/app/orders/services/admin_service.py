from app.orders.repositories.order_repository import OrderRepository


class OrderAdminService:

    @staticmethod
    def list_all_orders(params):
        return None, OrderRepository.get_admin_order_list(params)

    @staticmethod
    def get_order_details_by_uid(uid):
        order = OrderRepository.get_admin_order_by_uid(uid)
        return (None, order) if order else ('Order not found.', None)

    @staticmethod
    def update_order_status(uid, target_status):
        return OrderRepository.update_order_status(uid, target_status)
