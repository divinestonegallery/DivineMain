import sys

from django.core.exceptions import ImproperlyConfigured

LOCAL_TEST_HOSTS = {'127.0.0.1', 'localhost'}
DISPOSABLE_NAME_PREFIX = 'divine_pgtest'
TEST_NAME_PREFIX = 'test_divine_pgtest'


def _identity(config):
    port = str(config.get('PORT') or '5432')
    return (
        (config.get('HOST') or '').lower(),
        port,
        str(config.get('NAME') or '').lower(),
    )


def validate_disposable_test_database(test_config, application_config=None):
    """Refuse every test target except a local disposable PostgreSQL database.

    The application DATABASE_URL is compared by name and is never used as the
    test database, its Django TEST.NAME, or a clone template.
    """
    engine = str(test_config.get('ENGINE') or '')
    host, _port, name = _identity(test_config)
    test_settings = test_config.get('TEST') or {}
    test_name = str(test_settings.get('NAME') or f'test_{name}').lower()
    template = str(test_settings.get('TEMPLATE') or '').lower()
    if not engine.endswith('postgresql'):
        raise ImproperlyConfigured(
            'Tests require PostgreSQL. SQLite is not supported.'
        )
    if (
        host not in LOCAL_TEST_HOSTS
        or 'neon' in host
        or 'neon' in name
        or 'neon' in test_name
    ):
        raise ImproperlyConfigured(
            'DIVINE_TEST_DATABASE_URL must use a local disposable PostgreSQL '
            'server. Tests will not use the shared application database.'
        )
    if not name.startswith(DISPOSABLE_NAME_PREFIX):
        raise ImproperlyConfigured(
            'The disposable database name must start with divine_pgtest.'
        )
    if not test_name.startswith(TEST_NAME_PREFIX):
        raise ImproperlyConfigured(
            'The Django test database name must start with test_divine_pgtest.'
        )
    if template and template not in {'template0', 'template1'}:
        raise ImproperlyConfigured(
            'Tests cannot clone another database. Leave the PostgreSQL template unset.'
        )
    if application_config:
        _app_host, _app_port, app_name = _identity(application_config)
        if app_name and app_name in {name, test_name}:
            raise ImproperlyConfigured(
                'Refusing to use the application database as the test database.'
            )
    return test_name


def verify_disposable_server():
    """Connect to the local server and confirm it can create the test database.

    Django creates ``TEST.NAME`` from the local maintenance database. This
    check reads DATABASE_URL only to reject that database name. It does not
    connect to it.
    """
    import os

    import dj_database_url
    from django.conf import settings

    database = settings.DATABASES['default']
    application = None
    application_url = os.getenv('DATABASE_URL', '').strip()
    if application_url:
        application = dj_database_url.parse(application_url)
        if not str(application.get('ENGINE') or '').endswith('postgresql'):
            raise ImproperlyConfigured(
                'DATABASE_URL must use PostgreSQL. SQLite is not supported.'
            )
    test_name = validate_disposable_test_database(database, application)
    try:
        import psycopg2
        connection = psycopg2.connect(
            dbname='postgres',
            user=database.get('USER') or None,
            password=database.get('PASSWORD') or None,
            host=database.get('HOST') or None,
            port=database.get('PORT') or None,
            connect_timeout=5,
        )
    except Exception as exc:
        raise ImproperlyConfigured(
            'Disposable PostgreSQL is not available, so tests did not start. '
            'Start a local PostgreSQL server, create a database whose name '
            'starts with divine_pgtest, and set DIVINE_TEST_DATABASE_URL. '
            'Tests will not use SQLite or the application database.'
        ) from exc
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT current_database(), current_user')
            current_database, current_user = cursor.fetchone()
            cursor.execute(
                'SELECT rolcreatedb, rolsuper FROM pg_roles WHERE rolname = %s',
                [current_user],
            )
            createdb, is_superuser = cursor.fetchone()
        if current_database != 'postgres':
            raise ImproperlyConfigured(
                'Test setup could not use the local PostgreSQL maintenance database.'
            )
        if not (createdb or is_superuser):
            raise ImproperlyConfigured(
                'The disposable PostgreSQL role cannot create databases. '
                'Grant CREATEDB on the local test server. Tests were not run.'
            )
    finally:
        connection.close()
    sys.stderr.write(
        'Disposable PostgreSQL test target host=%s database=%s\n'
        % (database.get('HOST'), test_name)
    )
