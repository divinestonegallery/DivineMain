from django.test.runner import DiscoverRunner


# The project keeps tests in per-app tests/ packages. Django's default app
# discovery only looks for an app-level tests.py module, so those tests were
# silently skipped when running `manage.py test` without labels.
DEFAULT_TEST_LABELS = (
    'app.common.tests',
    'app.accounts.tests',
    'app.orders.tests',
)


class ProjectTestRunner(DiscoverRunner):
    def build_suite(self, test_labels=None, **kwargs):
        labels = tuple(test_labels or DEFAULT_TEST_LABELS)
        return super().build_suite(labels, **kwargs)
