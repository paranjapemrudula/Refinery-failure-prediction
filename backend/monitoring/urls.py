from django.urls import path

from .views import (
    AuthenticatorLoginApiView,
    DashboardApiView,
    DashboardView,
    MaintenanceAlertDetailApiView,
    PasswordResetWithOtpApiView,
    PredictionApiView,
    ReportDetailApiView,
    SignUpApiView,
    VerifyAuthenticatorSetupApiView,
    generated_report_view,
    prediction_result_view,
    sensor_entry_view,
)


urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("sensor-entry/", sensor_entry_view, name="sensor_entry"),
    path("prediction/<int:prediction_id>/", prediction_result_view, name="prediction_result"),
    path("reports/<int:report_id>/", generated_report_view, name="generated_report"),
    path("api/auth/signup/", SignUpApiView.as_view(), name="api_signup"),
    path("api/auth/signup/verify-otp/", VerifyAuthenticatorSetupApiView.as_view(), name="api_signup_verify_otp"),
    path("api/auth/login/", AuthenticatorLoginApiView.as_view(), name="api_login"),
    path("api/auth/reset-password/otp/", PasswordResetWithOtpApiView.as_view(), name="api_reset_password_otp"),
    path("api/dashboard/", DashboardApiView.as_view(), name="api_dashboard"),
    path("api/alerts/<int:alert_id>/", MaintenanceAlertDetailApiView.as_view(), name="api_alert_detail"),
    path("api/reports/<int:report_id>/", ReportDetailApiView.as_view(), name="api_report_detail"),
    path("api/predict/", PredictionApiView.as_view(), name="api_predict"),
]
