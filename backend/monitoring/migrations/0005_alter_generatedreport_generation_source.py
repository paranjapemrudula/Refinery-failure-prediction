from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0004_generatedreport_generation_source"),
    ]

    operations = [
        migrations.AlterField(
            model_name="generatedreport",
            name="generation_source",
            field=models.CharField(
                choices=[
                    ("rule_based", "Rule Based"),
                    ("openai", "OpenAI"),
                    ("gemini", "Gemini"),
                ],
                default="rule_based",
                max_length=20,
            ),
        ),
    ]
