from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from divine_main.test_database import validate_disposable_test_database


def _postgres(name, host='127.0.0.1'):
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': host,
        'PORT': '5432',
        'NAME': name,
        'TEST': {'NAME': 'test_%s' % name},
    }


class DisposableDatabaseGuardTests(SimpleTestCase):
    def test_local_disposable_database_is_accepted(self):
        test_name = validate_disposable_test_database(
            _postgres('divine_pgtest'),
            _postgres('application_db', host='remote.example'),
        )
        self.assertEqual(test_name, 'test_divine_pgtest')

    def test_sqlite_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_disposable_test_database({
                'ENGINE': 'django.db.backends.sqlite3',
                'HOST': '',
                'NAME': ':memory:',
            })

    def test_remote_and_neon_hosts_are_rejected(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_disposable_test_database(_postgres('divine_pgtest', host='db.neon.tech'))
        with self.assertRaises(ImproperlyConfigured):
            validate_disposable_test_database(_postgres('divine_pgtest', host='db.example.com'))

    def test_application_database_name_cannot_be_the_test_database(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_disposable_test_database(
                _postgres('divine_pgtest'),
                _postgres('divine_pgtest', host='remote.example'),
            )
        with self.assertRaises(ImproperlyConfigured):
            validate_disposable_test_database(
                _postgres('divine_pgtest'),
                _postgres('test_divine_pgtest', host='remote.example'),
            )

    def test_another_database_cannot_be_the_clone_template(self):
        target = _postgres('divine_pgtest')
        target['TEST'] = {'NAME': 'test_divine_pgtest', 'TEMPLATE': 'application_db'}
        with self.assertRaises(ImproperlyConfigured):
            validate_disposable_test_database(target)
