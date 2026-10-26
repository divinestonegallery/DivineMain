import django.db.models.deletion
from django.db import migrations, models


def clear_legacy_audit_actors(apps, schema_editor):
    """Keep audit and error rows, but do not copy old account ids onto Employee.

    The replacement actor column is left null. Upload sessions keep their
    rows; accounts.0004 clears created_by before the old user rows are deleted.
    """
    for model_name in ('StaffAuditLog', 'APIErrorLog'):
        apps.get_model('common', model_name).objects.all().update(actor_employee=None)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_and_employee'),
        ('common', '0005_add_deity_image_upload_purpose'),
    ]

    operations = [
        migrations.AddField(
            model_name='staffauditlog',
            name='actor_employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='apierrorlog',
            name='actor_employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(clear_legacy_audit_actors, migrations.RunPython.noop),
        migrations.RemoveField(model_name='staffauditlog', name='actor'),
        migrations.RemoveField(model_name='apierrorlog', name='actor'),
        migrations.RenameField(model_name='staffauditlog', old_name='actor_employee', new_name='actor'),
        migrations.RenameField(model_name='apierrorlog', old_name='actor_employee', new_name='actor'),
        migrations.AlterField(
            model_name='staffauditlog',
            name='actor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='audit_logs',
                to='accounts.employee',
            ),
        ),
        migrations.AlterField(
            model_name='apierrorlog',
            name='actor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='api_errors',
                to='accounts.employee',
            ),
        ),
        migrations.AlterField(
            model_name='uploadsession',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='upload_sessions',
                to='accounts.user',
            ),
        ),
    ]
