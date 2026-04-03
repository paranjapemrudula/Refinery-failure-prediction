from django.contrib.auth.models import User
from rest_framework import serializers
import re

from .models import GeneratedReport, MaintenanceAlert, PredictionResult, SensorReading


class UsernameRules:
    MIN_LENGTH = 4
    MAX_LENGTH = 30
    PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")

    @classmethod
    def validate(cls, value, *, field_name="username"):
        username = str(value or "").strip()
        errors = []

        if not username:
            errors.append("Username is required.")
        if len(username) < cls.MIN_LENGTH:
            errors.append(
                f"Username must be at least {cls.MIN_LENGTH} characters long."
            )
        if len(username) > cls.MAX_LENGTH:
            errors.append(
                f"Username must not be longer than {cls.MAX_LENGTH} characters."
            )
        if username.isdigit():
            errors.append("Username cannot contain only numbers.")
        if not cls.PATTERN.fullmatch(username):
            errors.append(
                "Username must start with a letter and contain only letters, numbers, or underscores."
            )

        if errors:
            raise serializers.ValidationError(errors)

        return username


class PasswordRules:
    MIN_LENGTH = 8

    @classmethod
    def validate(cls, value, *, field_name="password"):
        password = str(value or "")
        errors = []

        if len(password) < cls.MIN_LENGTH:
            errors.append(
                f"Password must be at least {cls.MIN_LENGTH} characters long."
            )
        if not re.search(r"[A-Z]", password):
            errors.append("Password must include at least one uppercase letter.")
        if not re.search(r"[a-z]", password):
            errors.append("Password must include at least one lowercase letter.")
        if not re.search(r"\d", password):
            errors.append("Password must include at least one number.")
        if not re.search(r"[^A-Za-z0-9]", password):
            errors.append("Password must include at least one special character.")

        if errors:
            raise serializers.ValidationError({field_name: errors})

        return password


class OtpRules:
    PATTERN = re.compile(r"^\d{6}$")

    @classmethod
    def validate(cls, value):
        otp_code = str(value or "").strip()
        if not cls.PATTERN.fullmatch(otp_code):
            raise serializers.ValidationError(
                "OTP must be exactly 6 numeric digits."
            )
        return otp_code


class MachineIdRules:
    PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")

    @classmethod
    def validate(cls, value):
        machine_id = str(value or "").strip()
        if not machine_id:
            raise serializers.ValidationError("Machine ID is required.")
        if len(machine_id) > 50:
            raise serializers.ValidationError(
                "Machine ID must not be longer than 50 characters."
            )
        if not cls.PATTERN.fullmatch(machine_id):
            raise serializers.ValidationError(
                "Machine ID must start with a letter and contain only letters, numbers, underscores, or hyphens."
            )
        return machine_id


class SensorValueRules:
    SENSOR_FIELDS = {
        "temperature": "Temperature",
        "pressure": "Pressure",
        "vibration": "Vibration",
        "flow_rate": "Flow rate",
        "humidity": "Humidity",
    }

    @classmethod
    def validate(cls, attrs):
        errors = {}

        for field_name, label in cls.SENSOR_FIELDS.items():
            value = attrs.get(field_name)
            if value is None:
                errors[field_name] = f"{label} is required."
                continue
            if value == 0:
                errors[field_name] = (
                    f"{label} cannot be 0. Enter a realistic sensor value."
                )
                continue
            if value < 0:
                errors[field_name] = f"{label} cannot be negative."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class SensorReadingInputSerializer(serializers.Serializer):
    machine_id = serializers.CharField(max_length=50)
    temperature = serializers.FloatField()
    pressure = serializers.FloatField()
    vibration = serializers.FloatField()
    flow_rate = serializers.FloatField()
    humidity = serializers.FloatField()

    def validate_machine_id(self, value):
        return MachineIdRules.validate(value)

    def validate(self, attrs):
        return SensorValueRules.validate(attrs)


class SignUpSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    enable_authenticator = serializers.BooleanField(required=False, default=True)

    def validate_username(self, value):
        value = UsernameRules.validate(value)
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        PasswordRules.validate(attrs["password"], field_name="password")

        return attrs

    def create(self, validated_data):
        validated_data.pop("enable_authenticator", True)
        validated_data.pop("confirm_password")
        user = User.objects.create_user(**validated_data)
        return user


class AuthenticatorVerificationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    otp_code = serializers.CharField(max_length=6)

    def validate_username(self, value):
        return UsernameRules.validate(value)

    def validate_otp_code(self, value):
        return OtpRules.validate(value)


class AuthenticatorLoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        identifier = str(value or "").strip()
        if not identifier:
            raise serializers.ValidationError("Username or email is required.")
        return identifier

    def validate_password(self, value):
        password = str(value or "")
        if not password:
            raise serializers.ValidationError("Password is required.")
        return password


class PasswordResetWithOtpSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        identifier = str(value or "").strip()
        if not identifier:
            raise serializers.ValidationError("Username or email is required.")
        return identifier

    def validate_otp_code(self, value):
        return OtpRules.validate(value)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        PasswordRules.validate(attrs["new_password"], field_name="new_password")

        return attrs


class SensorReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorReading
        fields = [
            "id",
            "machine_id",
            "temperature",
            "pressure",
            "vibration",
            "flow_rate",
            "humidity",
            "recorded_at",
        ]


class PredictionResultSerializer(serializers.ModelSerializer):
    sensor_reading = SensorReadingSerializer()

    class Meta:
        model = PredictionResult
        fields = [
            "id",
            "predicted_failure",
            "failure_probability",
            "alert_level",
            "recommended_action",
            "explanation",
            "created_at",
            "sensor_reading",
        ]


class MaintenanceAlertSerializer(serializers.ModelSerializer):
    prediction = PredictionResultSerializer()

    class Meta:
        model = MaintenanceAlert
        fields = [
            "id",
            "severity",
            "scheduled_for",
            "status",
            "note",
            "created_at",
            "prediction",
        ]


class MaintenanceAlertUpdateSerializer(serializers.ModelSerializer):
    scheduled_for = serializers.DateTimeField(required=False)
    status = serializers.ChoiceField(
        choices=MaintenanceAlert.STATUS_CHOICES,
        required=False,
    )
    note = serializers.CharField(required=False, allow_blank=False)

    class Meta:
        model = MaintenanceAlert
        fields = [
            "scheduled_for",
            "status",
            "note",
        ]

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )
        return attrs


class GeneratedReportSerializer(serializers.ModelSerializer):
    prediction = PredictionResultSerializer()

    class Meta:
        model = GeneratedReport
        fields = [
            "id",
            "title",
            "summary",
            "root_cause",
            "recommended_steps",
            "generation_source",
            "generated_at",
            "prediction",
        ]
