import json

from django.test.runner import DiscoverRunner


# The project keeps tests in per-app tests/ packages. Django's default app
# discovery only looks for an app-level tests.py module, so those tests were
# silently skipped when running `manage.py test` without labels.
DEFAULT_TEST_LABELS = (
    'app.common.tests',
    'app.accounts.tests',
    'app.orders.tests',
    'app.leads.tests',
    'app.integrations.tests',
)


def _allow_sqlite_test_migrations():
    """Let the in-memory SQLite test database build tables that use PostgreSQL arrays.

    Product migrations keep an ArrayField in their historical state. SQLite has
    no array type, and rebuilding a table during a later AddField would emit
    invalid `varchar[]` SQL. Tests store those values as JSON text. PostgreSQL
    migrations are unchanged.
    """
    from django.contrib.postgres.fields import ArrayField

    if getattr(ArrayField, '_divine_sqlite_test_patch', False):
        return
    original_db_type = ArrayField.db_type
    original_prep = ArrayField.get_db_prep_save

    def db_type(self, connection):
        if connection.vendor == 'sqlite':
            return 'text'
        return original_db_type(self, connection)

    def get_db_prep_save(self, value, connection):
        if connection.vendor == 'sqlite' and isinstance(value, list):
            return json.dumps(value)
        return original_prep(self, value, connection)

    ArrayField.db_type = db_type
    ArrayField.get_db_prep_save = get_db_prep_save
    ArrayField._divine_sqlite_test_patch = True


class ProjectTestRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        _allow_sqlite_test_migrations()
        super().setup_test_environment(**kwargs)

    def build_suite(self, test_labels=None, extra_tests=None, **kwargs):
        labels = tuple(test_labels or DEFAULT_TEST_LABELS)
        return super().build_suite(labels, extra_tests=extra_tests, **kwargs)
