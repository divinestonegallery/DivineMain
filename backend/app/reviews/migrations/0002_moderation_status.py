from django.db import migrations, models


def normalize_reviews(apps, schema_editor):
    Review = apps.get_model('reviews', 'Review')
    Review.objects.filter(is_approved=True).update(status='approved')
    seen = set()
    for review in Review.objects.exclude(user_id=None).order_by('-created_at', '-id'):
        key = (review.product_id, review.user_id)
        if key in seen:
            review.user_id = None
            review.save(update_fields=['user'])
        else:
            seen.add(key)


class Migration(migrations.Migration):
    dependencies = [('reviews', '0001_initial')]
    operations = [
        migrations.AddField(
            model_name='review', name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], db_index=True, default='pending', max_length=20),
        ),
        migrations.RunPython(normalize_reviews, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(condition=models.Q(('user__isnull', False)), fields=('product', 'user'), name='one_review_per_customer_product'),
        ),
    ]
