from django.db import models
from app.common.models import BaseModel

class Customer(BaseModel):
    clerk_user_id = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.name or self.email} ({self.clerk_user_id})"