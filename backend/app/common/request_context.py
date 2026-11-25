import contextvars


request_id_var = contextvars.ContextVar('divine_request_id', default='')


def current_request_id():
    """Request id for the current thread or async context, when middleware set one."""
    return request_id_var.get() or ''
