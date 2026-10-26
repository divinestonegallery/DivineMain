import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_and_employee'),
        ('contactus', '0004_website_lead_intake'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customizerequest',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='accounts.user',
            ),
        ),
    ]
