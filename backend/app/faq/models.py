from django.db import models
from app.common.models import BaseModel

class FAQ(BaseModel):
    question = models.TextField()
    answer = models.TextField()
    category = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.question
