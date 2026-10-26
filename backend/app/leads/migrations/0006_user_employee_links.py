import django.db.models.deletion
from django.db import migrations, models


def clear_legacy_staff_links(apps, schema_editor):
    """Detach staff links without copying legacy accounts into Employee.

    No Employee rows are created from old roles, so assignment, note
    authorship, and activity actors cannot be preserved. Those columns are
    cleared and the lead, note, and activity rows stay. Security groups and
    their permission codes stay.

    Lead notifications and group memberships cannot exist without an
    employee recipient or member. They are account-delivery rows, not lead
    or catalog records, and are deleted here. This data step is not
    reversible; restoring it requires a database backup.
    """
    apps.get_model('leads', 'LeadNotification').objects.all().delete()
    apps.get_model('leads', 'StaffGroupMembership').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_and_employee'),
        ('leads', '0005_login_touchpoint'),
    ]

    operations = [
        migrations.AddField(
            model_name='lead',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='owned_leads',
                to='accounts.user',
            ),
        ),
        migrations.AddField(
            model_name='lead',
            name='created_by_employee',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_leads',
                to='accounts.employee',
            ),
        ),
        migrations.AddField(
            model_name='lead',
            name='assigned_employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='leadnote',
            name='author_employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='leadactivity',
            name='actor_employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='leadnotification',
            name='recipient_employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='staffgroupmembership',
            name='employee',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(clear_legacy_staff_links, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name='staffgroupmembership',
            name='unique_staff_group_membership',
        ),
        migrations.RemoveField(model_name='lead', name='assigned_to'),
        migrations.RemoveField(model_name='leadnote', name='author'),
        migrations.RemoveField(model_name='leadactivity', name='actor'),
        migrations.RemoveField(model_name='leadnotification', name='recipient'),
        migrations.RemoveField(model_name='staffgroupmembership', name='customer'),
        migrations.RenameField(model_name='lead', old_name='assigned_employee', new_name='assigned_to'),
        migrations.RenameField(model_name='leadnote', old_name='author_employee', new_name='author'),
        migrations.RenameField(model_name='leadactivity', old_name='actor_employee', new_name='actor'),
        migrations.RenameField(
            model_name='leadnotification',
            old_name='recipient_employee',
            new_name='recipient',
        ),
        migrations.AlterField(
            model_name='lead',
            name='assigned_to',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_leads',
                to='accounts.employee',
            ),
        ),
        migrations.AlterField(
            model_name='lead',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_leads',
                to='accounts.user',
            ),
        ),
        migrations.AlterField(
            model_name='leadnote',
            name='author',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='lead_notes',
                to='accounts.employee',
            ),
        ),
        migrations.AlterField(
            model_name='leadactivity',
            name='actor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='lead_activities',
                to='accounts.employee',
            ),
        ),
        migrations.AlterField(
            model_name='leadnotification',
            name='recipient',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='lead_notifications',
                to='accounts.employee',
            ),
        ),
        migrations.AlterField(
            model_name='staffgroupmembership',
            name='employee',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='staff_group_memberships',
                to='accounts.employee',
            ),
        ),
        migrations.AddConstraint(
            model_name='staffgroupmembership',
            constraint=models.UniqueConstraint(
                fields=('employee', 'group'),
                name='unique_staff_group_membership',
            ),
        ),
    ]
