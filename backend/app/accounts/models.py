from django.db import models

from app.common.models import BaseModel


class User(BaseModel):
    """Customer-facing account. A user does not need an employee record."""

    clerk_user_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return self.name or self.email


class Employee(BaseModel):
    """Admin-app access for one user. Roles live here, not on the user."""

    class Role(models.TextChoices):
        STAFF = 'staff', 'Staff'
        ADMIN = 'admin', 'Admin'

    user = models.OneToOneField(User, related_name='employee', on_delete=models.CASCADE)
    # Admin Clerk subject. Kept off User so it cannot replace a consumer Clerk id.
    clerk_user_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def email(self):
        return self.user.email

    @property
    def name(self):
        return self.user.name

    @property
    def phone(self):
        return self.user.phone

    def __str__(self):
        return f'{self.email} ({self.role})'
