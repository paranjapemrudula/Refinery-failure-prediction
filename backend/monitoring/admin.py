from django.contrib import admin

from .models import GeneratedReport, MaintenanceAlert, PredictionResult, SensorReading


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = (
        "machine_id",
        "temperature",
        "pressure",
        "vibration",
        "flow_rate",
        "humidity",
        "recorded_at",
    )
    list_filter = ("machine_id", "recorded_at")
    search_fields = ("machine_id",)


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = (
        "sensor_reading",
        "predicted_failure",
        "failure_probability",
        "alert_level",
        "created_at",
    )
    list_filter = ("predicted_failure", "alert_level", "created_at")
    search_fields = ("sensor_reading__machine_id",)


@admin.register(MaintenanceAlert)
class MaintenanceAlertAdmin(admin.ModelAdmin):
    list_display = ("prediction", "severity", "scheduled_for", "status", "created_at")
    list_filter = ("severity", "status", "created_at")
    search_fields = ("prediction__sensor_reading__machine_id",)


@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    list_display = ("prediction", "title", "generated_at")
    list_filter = ("generated_at",)
    search_fields = ("prediction__sensor_reading__machine_id", "title")

# Register your models here.
