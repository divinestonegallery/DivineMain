from django.db import models

from app.common.models import BaseModel


class GoogleAdsLeadForm(BaseModel):
    """Attribution captured from one accepted Google Ads lead-form delivery.

    A person who submits two Google forms while one lead is still open gets one
    lead and one of these rows per event, so the relationship is one-to-many.
    external_id is the provider's own lead id and is unique here: it is what
    makes a replayed delivery a no-op. Lead.external_id only records the event
    that first created a provider lead, so this row is the authoritative
    per-event identifier.
    """

    lead = models.ForeignKey(
        'leads.Lead',
        related_name='google_ads_forms',
        on_delete=models.CASCADE,
    )
    external_id = models.CharField(max_length=255, unique=True)
    form_id = models.CharField(max_length=32, blank=True, default='')
    campaign_id = models.CharField(max_length=32, blank=True, default='')
    adgroup_id = models.CharField(max_length=32, blank=True, default='')
    creative_id = models.CharField(max_length=32, blank=True, default='')
    asset_group_id = models.CharField(max_length=32, blank=True, default='')
    gcl_id = models.CharField(max_length=255, blank=True, default='')
    lead_stage = models.CharField(max_length=80, blank=True, default='')
    form_origin = models.CharField(max_length=80, blank=True, default='')
    submitted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'Google Ads form {self.external_id} for lead {self.lead_id}'
