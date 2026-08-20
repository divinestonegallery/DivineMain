from django.db import models
from app.common.models import BaseModel

class Customer(BaseModel):
    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        STAFF = 'staff', 'Staff'
        ADMIN = 'admin', 'Admin'

    clerk_user_id = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    is_active = models.BooleanField(default=True)

    @property
    def is_authenticated(self):
        """Allow a verified Clerk customer to act as DRF's request.user."""
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.name or self.email} ({self.clerk_user_id})"
