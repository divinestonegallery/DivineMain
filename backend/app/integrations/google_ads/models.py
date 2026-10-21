from django.db import models

from app.common.models import BaseModel


class GoogleAdsLeadForm(BaseModel):
    """Attribution captured from one accepted Google Ads lead-form delivery."""

    lead = models.OneToOneField(
        'leads.Lead',
        related_name='google_ads_form',
        on_delete=models.CASCADE,
    )
    form_id = models.CharField(max_length=32, blank=True, default='')
    campaign_id = models.CharField(max_length=32, blank=True, default='')
    adgroup_id = models.CharField(max_length=32, blank=True, default='')
    creative_id = models.CharField(max_length=32, blank=True, default='')
    asset_group_id = models.CharField(max_length=32, blank=True, default='')
    gcl_id = models.CharField(max_length=255, blank=True, default='')
    lead_stage = models.CharField(max_length=80, blank=True, default='')
    form_origin = models.CharField(max_length=80, blank=True, default='')
    submitted_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f'Google Ads form for {self.lead_id}'
