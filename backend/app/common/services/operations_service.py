from app.common.repositories import OperationsRepository


class OperationsService:
    @staticmethod
    def list_audits(params):
        return None, OperationsRepository.list_audits(params['page'], params['page_size'])

    @staticmethod
    def list_errors(params):
        return None, OperationsRepository.list_errors(params['page'], params['page_size'])

    @staticmethod
    def readiness():
        try:
            ready = OperationsRepository.database_ready()
            return None, {'status': 'ready' if ready else 'unavailable', 'database': ready}
        except Exception:
            return 'Database is unavailable', None
