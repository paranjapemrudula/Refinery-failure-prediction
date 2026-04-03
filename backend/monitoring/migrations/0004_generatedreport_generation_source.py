from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0003_authenticatorprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="generatedreport",
            name="generation_source",
            field=models.CharField(
                choices=[("rule_based", "Rule Based"), ("openai", "OpenAI")],
                default="rule_based",
                max_length=20,
            ),
        ),
    ]
