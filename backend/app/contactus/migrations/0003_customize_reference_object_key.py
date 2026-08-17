from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('contactus', '0002_request_workflow_statuses')]

    operations = [
        migrations.AddField(
            model_name='customizerequest',
            name='reference_object_key',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
