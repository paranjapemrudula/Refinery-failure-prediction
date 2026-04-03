from django.contrib.auth.models import User
from django.db import models


class SensorReading(models.Model):
    machine_id = models.CharField(max_length=50)
    temperature = models.FloatField()
    pressure = models.FloatField()
    vibration = models.FloatField()
    flow_rate = models.FloatField()
    humidity = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.machine_id} at {self.recorded_at:%Y-%m-%d %H:%M:%S}"


class PredictionResult(models.Model):
    sensor_reading = models.OneToOneField(
        SensorReading,
        on_delete=models.CASCADE,
        related_name="prediction",
    )
    predicted_failure = models.BooleanField()
    failure_probability = models.FloatField()
    alert_level = models.CharField(max_length=20)
    recommended_action = models.TextField()
    explanation = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "Failure Risk" if self.predicted_failure else "Healthy"
        return f"{self.sensor_reading.machine_id} - {status}"


class MaintenanceAlert(models.Model):
    STATUS_PENDING = "pending"
    STATUS_SCHEDULED = "scheduled"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_COMPLETED, "Completed"),
    ]

    prediction = models.OneToOneField(
        PredictionResult,
        on_delete=models.CASCADE,
        related_name="maintenance_alert",
    )
    severity = models.CharField(max_length=20)
    scheduled_for = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.prediction.sensor_reading.machine_id} - {self.severity}"


class GeneratedReport(models.Model):
    SOURCE_RULE_BASED = "rule_based"
    SOURCE_OPENAI = "openai"
    SOURCE_CHOICES = [
        (SOURCE_RULE_BASED, "Rule Based"),
        (SOURCE_OPENAI, "OpenAI"),
    ]

    prediction = models.OneToOneField(
        PredictionResult,
        on_delete=models.CASCADE,
        related_name="generated_report",
    )
    title = models.CharField(max_length=200)
    summary = models.TextField()
    root_cause = models.TextField()
    recommended_steps = models.TextField()
    generation_source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_RULE_BASED,
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"Report - {self.prediction.sensor_reading.machine_id}"


class AuthenticatorProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="authenticator_profile",
    )
    secret = models.CharField(max_length=64, blank=True)
    is_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Authenticator - {self.user.username}"
