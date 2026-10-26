import subprocess
from pathlib import Path

from django.test import SimpleTestCase


SCRIPT = Path(__file__).resolve().parents[3] / 'scripts' / 'disposable_postgres.sh'


class DisposablePostgresScriptTests(SimpleTestCase):
    def test_script_targets_only_the_local_disposable_database(self):
        text = SCRIPT.read_text()
        self.assertIn('HOST=127.0.0.1', text)
        self.assertIn('PORT=54330', text)
        self.assertIn('CONTAINER=divine-pgtest', text)
        self.assertIn('DB=divine_pgtest', text)
        self.assertIn('env -u DATABASE_URL', text)
        self.assertNotIn('sqlite', text.lower())
        self.assertNotIn('.env.admin', text)
        self.assertNotIn('.env.consumer', text)
        self.assertLess(text.index('--confirm-remove'), text.index('docker rm'))

    def test_remove_without_confirmation_refuses(self):
        completed = subprocess.run(
            ['sh', str(SCRIPT), 'remove'],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 1)
        self.assertIn('Refusing to remove divine-pgtest', completed.stderr)
        self.assertNotIn('Removed divine-pgtest', completed.stdout)
