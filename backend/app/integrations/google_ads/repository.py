from app.common.models import ProcessedWebhook
from app.integrations.google_ads.models import GoogleAdsLeadForm


PROVIDER = 'google_ads'


class GoogleAdsIngestionRepository:
    @staticmethod
    def lead_id_for_event(external_id):
        """The lead a provider event was already attributed to, if any.

        This is the event-level idempotency check. It reads the attribution row
        rather than Lead.external_id because an event that reused an existing
        lead never writes its id onto that lead.
        """
        return GoogleAdsLeadForm.objects.filter(
            external_id=external_id,
        ).values_list('lead_id', flat=True).first()

    @staticmethod
    def save_form(lead_id, detail):
        GoogleAdsLeadForm.objects.create(
            lead_id=lead_id,
            external_id=detail['lead_id'],
            form_id=detail['form_id'],
            campaign_id=detail['campaign_id'],
            adgroup_id=detail['adgroup_id'],
            creative_id=detail['creative_id'],
            asset_group_id=detail['asset_group_id'],
            gcl_id=detail['gcl_id'],
            lead_stage=detail['lead_stage'],
            form_origin=detail['form_origin'],
            submitted_at=detail['submitted_at'],
        )

    @staticmethod
    def mark_processed(event_id, event_type):
        ProcessedWebhook.objects.create(
            provider=PROVIDER,
            event_id=event_id,
            event_type=event_type,
        )

    @staticmethod
    def forms_for_lead(lead_id):
        """Every provider event attributed to this lead, newest first."""
        return [
            {
                'external_id': form.external_id,
                'form_id': form.form_id,
                'campaign_id': form.campaign_id,
                'adgroup_id': form.adgroup_id,
                'creative_id': form.creative_id,
                'asset_group_id': form.asset_group_id,
                'gcl_id': form.gcl_id,
                'lead_stage': form.lead_stage,
                'form_origin': form.form_origin,
                'submitted_at': form.submitted_at,
            }
            for form in GoogleAdsLeadForm.objects.filter(lead_id=lead_id)
        ]
