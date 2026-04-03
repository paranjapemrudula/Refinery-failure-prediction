from django.contrib import messages
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Avg, Count
from django.db.models import Q
from django.shortcuts import redirect, render
from django.views.generic import TemplateView
from pathlib import Path
import json
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .auth_services import AuthenticatorEnrollmentService
from .forms import SensorReadingForm
from .models import GeneratedReport, MaintenanceAlert, PredictionResult, SensorReading
from .serializers import (
    AuthenticatorLoginSerializer,
    AuthenticatorVerificationSerializer,
    GeneratedReportSerializer,
    MaintenanceAlertSerializer,
    MaintenanceAlertUpdateSerializer,
    PasswordResetWithOtpSerializer,
    PredictionResultSerializer,
    SensorReadingInputSerializer,
    SignUpSerializer,
)
from .services import create_prediction_for_reading


MODEL_METADATA_PATH = (
    Path(__file__).resolve().parents[1] / "artifacts" / "failure_model_metadata.json"
)


def load_model_metadata():
    if not MODEL_METADATA_PATH.exists():
        return {}

    with MODEL_METADATA_PATH.open("r", encoding="utf-8") as metadata_file:
        return json.load(metadata_file)


def get_known_machine_ids():
    metadata = load_model_metadata()
    metadata_machine_ids = metadata.get("known_machine_ids", [])
    live_machine_ids = list(
        SensorReading.objects.order_by().values_list("machine_id", flat=True).distinct()
    )
    return sorted(
        {
            machine_id
            for machine_id in [*metadata_machine_ids, *live_machine_ids]
            if machine_id
        }
    )


def resolve_user_by_identifier(identifier):
    return User.objects.filter(
        Q(username__iexact=identifier) | Q(email__iexact=identifier)
    ).first()


class DashboardView(TemplateView):
    template_name = "monitoring/dashboard.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        latest_predictions = PredictionResult.objects.select_related(
            "sensor_reading"
        )[:6]
        recent_reports = GeneratedReport.objects.select_related(
            "prediction__sensor_reading"
        )[:5]
        active_alerts = MaintenanceAlert.objects.select_related(
            "prediction__sensor_reading"
        )[:6]
        machine_status_cards = self.get_machine_status_cards()
        alert_distribution = self.get_alert_distribution()
        context.update(
            {
                "total_readings": SensorReading.objects.count(),
                "high_alerts": MaintenanceAlert.objects.filter(severity="High").count(),
                "latest_predictions": latest_predictions,
                "recent_reports": recent_reports,
                "active_alerts": active_alerts,
                "machine_status_cards": machine_status_cards,
                "alert_distribution": alert_distribution,
                "average_failure_probability": PredictionResult.objects.aggregate(
                    Avg("failure_probability")
                )["failure_probability__avg"],
            }
        )
        return context

    def get_machine_status_cards(self):
        machine_ids = (
            SensorReading.objects.order_by()
            .values_list("machine_id", flat=True)
            .distinct()
        )
        cards = []
        for machine_id in machine_ids:
            latest_reading = (
                SensorReading.objects.filter(machine_id=machine_id)
                .select_related("prediction")
                .first()
            )
            if not latest_reading:
                continue

            prediction = getattr(latest_reading, "prediction", None)
            probability = prediction.failure_probability if prediction else 0
            cards.append(
                {
                    "machine_id": machine_id,
                    "recorded_at": latest_reading.recorded_at,
                    "temperature": latest_reading.temperature,
                    "pressure": latest_reading.pressure,
                    "vibration": latest_reading.vibration,
                    "flow_rate": latest_reading.flow_rate,
                    "humidity": latest_reading.humidity,
                    "status_label": (
                        "Failure Risk"
                        if prediction and prediction.predicted_failure
                        else "Healthy"
                    ),
                    "status_class": (
                        "status-risk"
                        if prediction and prediction.predicted_failure
                        else "status-healthy"
                    ),
                    "alert_level": prediction.alert_level if prediction else "Low",
                    "probability_percent": round(probability * 100, 1),
                }
            )
        return cards

    def get_alert_distribution(self):
        alert_counts = {
            item["alert_level"]: item["count"]
            for item in PredictionResult.objects.values("alert_level").annotate(
                count=Count("id")
            )
        }
        total = sum(alert_counts.values()) or 1
        distribution = []
        for level in ["Low", "Medium", "High"]:
            count = alert_counts.get(level, 0)
            distribution.append(
                {
                    "label": level,
                    "count": count,
                    "width_percent": round((count / total) * 100, 1),
                    "css_class": f"status-{level.lower()}",
                }
            )
        return distribution


def sensor_entry_view(request):
    if request.method == "POST":
        form = SensorReadingForm(request.POST)
        if form.is_valid():
            reading = form.save()
            prediction = create_prediction_for_reading(reading)
            messages.success(request, "Sensor reading submitted successfully.")
            return redirect("prediction_result", prediction_id=prediction.id)
    else:
        form = SensorReadingForm()

    recent_predictions = SensorReading.objects.select_related("prediction")[:5]
    context = {
        "form": form,
        "recent_predictions": recent_predictions,
    }
    return render(request, "monitoring/sensor_entry.html", context)


def prediction_result_view(request, prediction_id):
    prediction = PredictionResult.objects.select_related("sensor_reading").get(id=prediction_id)
    context = {
        "prediction": prediction,
        "alert": getattr(prediction, "maintenance_alert", None),
        "report": getattr(prediction, "generated_report", None),
    }
    return render(request, "monitoring/prediction_result.html", context)


def generated_report_view(request, report_id):
    report = GeneratedReport.objects.select_related(
        "prediction__sensor_reading"
    ).get(id=report_id)
    context = {
        "report": report,
        "prediction": report.prediction,
        "alert": getattr(report.prediction, "maintenance_alert", None),
    }
    return render(request, "monitoring/generated_report.html", context)


class PredictionApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SensorReadingInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reading = SensorReading.objects.create(**serializer.validated_data)
        prediction = create_prediction_for_reading(reading)

        response_payload = {
            "machine_id": reading.machine_id,
            "timestamp": reading.recorded_at.isoformat(),
            "prediction": "Failure Risk" if prediction.predicted_failure else "Healthy",
            "failure_probability": prediction.failure_probability,
            "alert_level": prediction.alert_level,
            "recommended_action": prediction.recommended_action,
            "explanation": prediction.explanation,
            "report_id": getattr(prediction.generated_report, "id", None),
            "report_source": getattr(prediction.generated_report, "generation_source", None),
            "safety_override_applied": getattr(
                prediction, "safety_override_applied", False
            ),
        }
        return Response(response_payload, status=status.HTTP_201_CREATED)


class SignUpApiView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if serializer.validated_data.get("enable_authenticator", True):
            profile = AuthenticatorEnrollmentService.create_pending_profile(user)
            return Response(
                {
                    "message": "Account created. Complete Microsoft Authenticator setup for secure password reset.",
                    **AuthenticatorEnrollmentService.build_setup_payload(user, profile),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {
                "message": "Account created successfully.",
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyAuthenticatorSetupApiView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = AuthenticatorVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = resolve_user_by_identifier(serializer.validated_data["username"])
            if not user:
                raise User.DoesNotExist
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not AuthenticatorEnrollmentService.verify_and_enable(
            user, serializer.validated_data["otp_code"]
        ):
            return Response(
                {"detail": "Invalid authenticator code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "Authenticator enabled successfully for password reset and account recovery."},
            status=status.HTTP_200_OK,
        )


class AuthenticatorLoginApiView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = AuthenticatorLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        lookup_user = resolve_user_by_identifier(username)
        auth_username = lookup_user.username if lookup_user else username
        user = authenticate(username=auth_username, password=password)
        if not user:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetWithOtpApiView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetWithOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = resolve_user_by_identifier(serializer.validated_data["username"])
            if not user:
                raise User.DoesNotExist
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found. Enter the registered username or email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not AuthenticatorEnrollmentService.verify_reset_otp(
            user, serializer.validated_data["otp_code"]
        ):
            return Response(
                {"detail": "Invalid authenticator code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response(
            {"message": "Password reset successful. You can log in now."},
            status=status.HTTP_200_OK,
        )


class DashboardApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        model_metadata = load_model_metadata()
        machine_id = request.GET.get("machine_id")
        readings = SensorReading.objects.select_related("prediction")
        predictions = PredictionResult.objects.select_related("sensor_reading")
        active_alerts = MaintenanceAlert.objects.select_related(
            "prediction__sensor_reading"
        )
        recent_reports = GeneratedReport.objects.select_related(
            "prediction__sensor_reading"
        )

        if machine_id:
            readings = readings.filter(machine_id=machine_id)
            predictions = predictions.filter(sensor_reading__machine_id=machine_id)
            active_alerts = active_alerts.filter(
                prediction__sensor_reading__machine_id=machine_id
            )
            recent_reports = recent_reports.filter(
                prediction__sensor_reading__machine_id=machine_id
            )

        chart_readings = list(readings.order_by("-recorded_at")[:12])
        chart_readings.reverse()

        payload = {
            "summary": {
                "total_readings": readings.count(),
                "high_alerts": MaintenanceAlert.objects.filter(severity="High").count(),
                "average_failure_probability": predictions.aggregate(
                    Avg("failure_probability")
                )["failure_probability__avg"],
            },
            "machines": sorted(
                get_known_machine_ids()
            ),
            "latest_predictions": PredictionResultSerializer(
                predictions.order_by("-created_at")[:8], many=True
            ).data,
            "active_alerts": MaintenanceAlertSerializer(
                active_alerts.order_by("scheduled_for", "-created_at")[:6],
                many=True,
            ).data,
            "recent_reports": GeneratedReportSerializer(
                recent_reports.order_by("-generated_at")[:6],
                many=True,
            ).data,
            "chart_data": [
                {
                    "timestamp": reading.recorded_at.isoformat(),
                    "machine_id": reading.machine_id,
                    "temperature": reading.temperature,
                    "pressure": reading.pressure,
                    "vibration": reading.vibration,
                    "flow_rate": reading.flow_rate,
                    "humidity": reading.humidity,
                    "failure_probability": getattr(
                        getattr(reading, "prediction", None),
                        "failure_probability",
                        0,
                    ),
                }
                for reading in chart_readings
            ],
            "model_metrics": {
                "accuracy": model_metadata.get("accuracy"),
                "precision": model_metadata.get("precision"),
                "recall": model_metadata.get("recall"),
                "f1_score": model_metadata.get("f1_score"),
                "model_type": model_metadata.get("model_type"),
                "threshold": model_metadata.get("decision_threshold"),
                "feature_count": len(model_metadata.get("feature_columns", [])),
            },
        }
        return Response(payload)


class MaintenanceAlertDetailApiView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, alert_id):
        try:
            alert = MaintenanceAlert.objects.select_related(
                "prediction__sensor_reading"
            ).get(id=alert_id)
        except MaintenanceAlert.DoesNotExist:
            return Response(
                {"detail": "Maintenance alert not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MaintenanceAlertUpdateSerializer(
            alert,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MaintenanceAlertSerializer(alert).data, status=status.HTTP_200_OK)


class ReportDetailApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        report = GeneratedReport.objects.select_related(
            "prediction__sensor_reading"
        ).get(id=report_id)
        return Response(GeneratedReportSerializer(report).data)
