from django.db import models
from app.accounts.models import Customer
from app.common.models import BaseModel

class ContactMessage(BaseModel):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        CLOSED = 'closed', 'Closed'

    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    message = models.TextField()
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.NEW, db_index=True)

    def __str__(self):
        return f"Message from {self.name}"

class CustomizeRequest(BaseModel):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        QUOTED = 'quoted', 'Quoted'
        ACCEPTED = 'accepted', 'Accepted'
        CLOSED = 'closed', 'Closed'

    user = models.ForeignKey(Customer, on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=False, null=False)
    pincode = models.CharField(max_length=20, blank=True, null=True)
    approximate_height = models.CharField(max_length=100, blank=True, null=True)
    preferred_material = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    reference_image = models.URLField(max_length=1024, blank=True, null=True)
    reference_object_key = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.NEW, db_index=True)

    def __str__(self):
        return f"Customize Request from {self.city} - {self.status}"
