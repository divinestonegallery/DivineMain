from django.test.runner import DiscoverRunner

from divine_main.test_database import verify_disposable_server


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


class ProjectTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        verify_disposable_server()
        return super().setup_databases(**kwargs)

    def build_suite(self, test_labels=None, extra_tests=None, **kwargs):
        labels = tuple(test_labels or DEFAULT_TEST_LABELS)
        return super().build_suite(labels, extra_tests=extra_tests, **kwargs)
