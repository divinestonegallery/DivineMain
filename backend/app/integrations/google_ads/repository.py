from app.common.models import ProcessedWebhook
from app.integrations.google_ads.models import GoogleAdsLeadForm
from app.leads.constants import LEAD_SOURCE_GOOGLE_ADS
from app.leads.models import Lead


PROVIDER = 'google_ads'


class GoogleAdsIngestionRepository:
    @staticmethod
    def production_lead(external_id):
        return Lead.objects.filter(
            source=LEAD_SOURCE_GOOGLE_ADS,
            external_id=external_id,
        ).values_list('id', flat=True).first()

    @staticmethod
    def save_form(lead_id, detail):
        GoogleAdsLeadForm.objects.create(
            lead_id=lead_id,
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
    def form_for_lead(lead_id):
        form = GoogleAdsLeadForm.objects.filter(lead_id=lead_id).first()
        if not form:
            return None
        return {
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
