from django.db import migrations, models


class Migration(migrations.Migration):
    """Allow the login touchpoint on Lead.

    A successful customer session can now create an organic lead, so the
    touchpoint check constraint has to accept 'login'. The constraint is
    dropped and re-added because PostgreSQL cannot alter a CHECK in place.
    Existing rows keep their current touchpoint, and the replacement remains a
    superset of the previous one, so no data migration is required.
    """

    dependencies = [
        ('leads', '0004_google_ads_lead_form'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='lead',
            name='lead_touchpoint_valid',
        ),
        migrations.AddConstraint(
            model_name='lead',
            constraint=models.CheckConstraint(
                check=models.Q(
                    ('touchpoint', ''),
                    ('touchpoint__in', ('contact_us', 'product_enquiry', 'custom_moorti', 'lead_form', 'login')),
                    _connector='OR',
                ),
                name='lead_touchpoint_valid',
            ),
        ),
    ]
