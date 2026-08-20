from django.db import migrations, models


def normalize_statuses(apps, schema_editor):
    apps.get_model('contactus', 'ContactMessage').objects.filter(status='pending').update(status='new')
    apps.get_model('contactus', 'CustomizeRequest').objects.filter(status='pending').update(status='new')


class Migration(migrations.Migration):
    dependencies = [('contactus', '0001_initial')]
    operations = [
        migrations.RunPython(normalize_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='contactmessage', name='status',
            field=models.CharField(choices=[('new', 'New'), ('contacted', 'Contacted'), ('closed', 'Closed')], db_index=True, default='new', max_length=50),
        ),
        migrations.AlterField(
            model_name='customizerequest', name='status',
            field=models.CharField(choices=[('new', 'New'), ('contacted', 'Contacted'), ('quoted', 'Quoted'), ('accepted', 'Accepted'), ('closed', 'Closed')], db_index=True, default='new', max_length=50),
        ),
    ]
