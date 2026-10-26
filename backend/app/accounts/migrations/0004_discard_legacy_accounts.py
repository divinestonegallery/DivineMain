from django.db import migrations


def discard_legacy_accounts(apps, schema_editor):
    """Delete legacy account rows after business records have been detached.

    DEV and production have no real customer or employee logins. The old
    account table's users, staff, admins, role assignments, and Clerk subject
    mappings are not copied into User or Employee. This deletes those rows.

    Before the delete, account foreign keys on orders, reviews, customization
    requests, leads, and uploads are set to null. Those business rows stay.
    Catalog tables, Google Ads attribution, contact messages, lead notes, and
    lead activities are not deleted. Lead notifications and group memberships
    were already removed in leads.0006 because they cannot exist without an
    employee.

    This is destructive. Reversing the migration does not restore account
    rows, Clerk subjects, or the cleared relationships. Roll back by restoring
    a database backup taken before this migration.
    """
    apps.get_model('orders', 'Order').objects.update(customer_id=None)
    apps.get_model('reviews', 'Review').objects.update(user_id=None)
    apps.get_model('contactus', 'CustomizeRequest').objects.update(user_id=None)
    apps.get_model('leads', 'Lead').objects.update(user_id=None, created_by_id=None)
    apps.get_model('common', 'UploadSession').objects.update(created_by_id=None)
    apps.get_model('accounts', 'Employee').objects.all().delete()
    apps.get_model('accounts', 'User').objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_user_and_employee'),
        ('leads', '0006_user_employee_links'),
        ('common', '0006_employee_audit_actor'),
        ('orders', '0002_order_customer_user'),
        ('reviews', '0003_review_user'),
        ('contactus', '0005_customize_user'),
    ]

    operations = [
        migrations.RunPython(discard_legacy_accounts, migrations.RunPython.noop),
    ]
