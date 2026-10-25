from django.db import migrations


SALES_PERMISSIONS = (
    'leads.access',
    'leads.view_own',
    'leads.create',
    'leads.update_status',
    'leads.add_note',
    'leads.manage_follow_up',
    'leads.view_activity',
)


def provision_sales_group(apps, schema_editor):
    """Create the default Sales group and attach every existing active staff account.

    Administrators already have full lead access, so they are not added.
    Customers and inactive staff are left unchanged. Re-running this operation
    does not duplicate the group, its permissions, or memberships.
    """
    group_model = apps.get_model('leads', 'StaffSecurityGroup')
    permission_model = apps.get_model('leads', 'StaffGroupPermission')
    membership_model = apps.get_model('leads', 'StaffGroupMembership')
    customer_model = apps.get_model('accounts', 'Customer')

    group, created = group_model.objects.get_or_create(
        code='sales',
        defaults={
            'name': 'Sales',
            'description': 'Default access for staff who work leads.',
            'is_system': True,
        },
    )
    if created:
        permission_model.objects.bulk_create([
            permission_model(group=group, code=code)
            for code in SALES_PERMISSIONS
        ])

    staff = customer_model.objects.filter(role='staff', is_active=True)
    for customer in staff:
        membership_model.objects.get_or_create(customer=customer, group=group)


class Migration(migrations.Migration):

    dependencies = [
        ('leads', '0001_initial_lead_management'),
        ('accounts', '0002_customer_is_active_customer_role'),
    ]

    operations = [
        migrations.RunPython(provision_sales_group, migrations.RunPython.noop),
    ]
