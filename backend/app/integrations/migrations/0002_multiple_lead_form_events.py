from django.db import migrations, models
import django.db.models.deletion


def backfill_external_ids(apps, _schema_editor):
    """Give every existing attribution row the provider lead id that created it.

    Until now a lead held at most one attribution row, and that row was always
    written immediately after a provider lead whose Lead.external_id is the
    same Google lead id. Rows whose lead somehow has no external_id keep a
    deterministic placeholder so the row is preserved and the new unique
    constraint can still be applied.
    """
    GoogleAdsLeadForm = apps.get_model('integrations', 'GoogleAdsLeadForm')
    for form in GoogleAdsLeadForm.objects.select_related('lead').iterator():
        form.external_id = form.lead.external_id or f'legacy:{form.pk}'
        form.save(update_fields=['external_id'])


class Migration(migrations.Migration):
    """Let one lead hold an attribution row per provider event.

    A Google Ads event for somebody who already has an active lead now reuses
    that lead, so the one-to-one relationship can no longer hold every event.
    The change is additive and preserves all existing rows: the foreign key
    relaxes a constraint, and the new per-event external_id is backfilled
    before it becomes unique.

    Reversing this is only possible while no lead has more than one
    attribution row, because the one-to-one column cannot represent two.
    """

    dependencies = [
        ('integrations', '0001_google_ads_lead_form'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='googleadsleadform',
            options={'ordering': ['-created_at', '-id']},
        ),
        migrations.AlterField(
            model_name='googleadsleadform',
            name='lead',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='google_ads_forms',
                to='leads.lead',
            ),
        ),
        migrations.AddField(
            model_name='googleadsleadform',
            name='external_id',
            field=models.CharField(default='', max_length=255),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_external_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='googleadsleadform',
            name='external_id',
            field=models.CharField(max_length=255, unique=True),
        ),
    ]
