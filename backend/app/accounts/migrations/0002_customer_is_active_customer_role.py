from django.db import migrations, models


OWNER_EMAIL = "divinestonegallery@gmail.com"


def promote_existing_owner(apps, schema_editor):
    Customer = apps.get_model("accounts", "Customer")
    Customer.objects.filter(email__iexact=OWNER_EMAIL).update(role="admin")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="customer",
            name="role",
            field=models.CharField(
                choices=[
                    ("customer", "Customer"),
                    ("staff", "Staff"),
                    ("admin", "Admin"),
                ],
                default="customer",
                max_length=20,
            ),
        ),
        migrations.RunPython(promote_existing_owner, migrations.RunPython.noop),
    ]
