from django.db import migrations, models
import django.db.models.functions.text


def normalize_duplicate_questions(apps, schema_editor):
    FAQ = apps.get_model('faq', 'FAQ')
    seen = set()
    for faq in FAQ.objects.order_by('id'):
        base = faq.question.strip()
        candidate = base
        counter = 2
        while candidate.casefold() in seen:
            candidate = f'{base} ({counter})'
            counter += 1
        if candidate != faq.question:
            faq.question = candidate
            faq.save(update_fields=['question'])
        seen.add(candidate.casefold())


class Migration(migrations.Migration):
    dependencies = [('faq', '0001_initial')]
    operations = [
        migrations.RunPython(normalize_duplicate_questions, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='faq',
            constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('question'), name='unique_faq_question_ci'),
        ),
    ]
