from django.db import models
from app.products.models import Product
from app.accounts.models import Customer
from django.core.validators import MinValueValidator, MaxValueValidator
from app.common.models import BaseModel

class Review(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(Customer, related_name='reviews', on_delete=models.CASCADE, blank=True, null=True)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    is_approved = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('product', 'user'),
                condition=models.Q(user__isnull=False),
                name='one_review_per_customer_product',
            )
        ]

    def __str__(self):
        return f"Review for {self.product.name} by {self.user.name if self.user else 'Anonymous'}"
