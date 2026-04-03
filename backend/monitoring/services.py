import json
from datetime import timedelta

import joblib
import pandas as pd
from django.conf import settings
from django.utils import timezone
from typing import Optional

from .models import GeneratedReport, MaintenanceAlert, PredictionResult, SensorReading

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - optional dependency
    OpenAI = None


FEATURE_COLUMNS = [
    "machine_id",
    "temperature",
    "pressure",
    "vibration",
    "flow_rate",
    "humidity",
]


def load_model_bundle():
    model_path = settings.ML_MODEL_PATH
    metadata_path = settings.ML_METADATA_PATH

    if not model_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(
            "Model artifacts are missing. Run `python scripts/train_failure_model.py` first."
        )

    model = joblib.load(model_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    return model, metadata


def build_feature_frame(reading: SensorReading):
    return pd.DataFrame(
        [
            {
                "machine_id": reading.machine_id,
                "temperature": reading.temperature,
                "pressure": reading.pressure,
                "vibration": reading.vibration,
                "flow_rate": reading.flow_rate,
                "humidity": reading.humidity,
            }
        ]
    )


def determine_alert_level(probability):
    if probability >= 0.8:
        return "High"
    if probability >= 0.5:
        return "Medium"
    return "Low"


def get_level_rank(level):
    return {"Low": 1, "Medium": 2, "High": 3}.get(level, 1)


def evaluate_safety_override(reading: SensorReading):
    reasons = []
    escalated_level = "Low"

    if reading.temperature >= 100:
        reasons.append(
            f"temperature reached a critical threshold ({reading.temperature})"
        )
        escalated_level = "High"

    if reading.pressure >= 280:
        reasons.append(f"pressure reached a critical threshold ({reading.pressure})")
        escalated_level = "High"

    if reading.vibration >= 0.60:
        reasons.append(
            f"vibration reached a critical threshold ({reading.vibration})"
        )
        escalated_level = "High"

    if not reasons and (
        reading.temperature >= 95
        or reading.pressure >= 240
        or reading.vibration >= 0.50
    ):
        reasons.append("one or more sensor values moved into a safety watch zone")
        escalated_level = "Medium"

    return escalated_level, reasons


def build_recommendation(reading: SensorReading, probability):
    if probability >= 0.8:
        return (
            f"Inspect {reading.machine_id} immediately. Focus on bearings, pressure line, "
            "and flow obstruction before the next cycle."
        )
    if probability >= 0.5:
        return (
            f"Schedule a maintenance inspection for {reading.machine_id} within 12 hours "
            "and review the recent trend of temperature, pressure, and vibration."
        )
    return (
        f"{reading.machine_id} is operating within a normal range. Continue monitoring "
        "and keep the current preventive maintenance schedule."
    )


def apply_safety_override_to_recommendation(recommendation, reasons):
    if not reasons:
        return recommendation
    return (
        f"{recommendation} Safety override applied because "
        + ", ".join(reasons)
        + "."
    )


def build_explanation(reading: SensorReading, probability):
    if probability >= 0.8:
        return (
            f"{reading.machine_id} shows a strong failure pattern with elevated temperature "
            f"({reading.temperature}), pressure ({reading.pressure}), and vibration "
            f"({reading.vibration}) combined with reduced flow rate ({reading.flow_rate}). "
            "This can indicate mechanical wear, blockage, or seal degradation."
        )
    if probability >= 0.5:
        return (
            f"{reading.machine_id} is trending toward an unstable state. Sensor values are "
            "moving away from the healthy baseline, so preventive inspection is recommended "
            "before the condition worsens."
        )
    return (
        f"{reading.machine_id} currently appears healthy. The submitted values are close to "
        "normal operating behavior based on the baseline training data."
    )


def apply_safety_override_to_explanation(explanation, reasons, final_alert_level):
    if not reasons:
        return explanation
    return (
        f"{explanation} A safety override escalated the alert to {final_alert_level} because "
        + ", ".join(reasons)
        + "."
    )


def maybe_create_alert(prediction: PredictionResult):
    if prediction.alert_level == "Low":
        return None

    offset_hours = 2 if prediction.alert_level == "High" else 12
    return MaintenanceAlert.objects.create(
        prediction=prediction,
        severity=prediction.alert_level,
        scheduled_for=timezone.now() + timedelta(hours=offset_hours),
        note=prediction.recommended_action,
    )


def infer_primary_issue(reading: SensorReading):
    if reading.vibration >= 0.58:
        return "bearing wear or shaft misalignment"
    if reading.pressure >= 235 and reading.flow_rate <= 112:
        return "line blockage or valve restriction"
    if reading.temperature >= 95:
        return "overheating caused by sustained mechanical stress"
    return "combined sensor drift that suggests early equipment degradation"


def build_report_sections(prediction: PredictionResult):
    reading = prediction.sensor_reading
    issue = infer_primary_issue(reading)
    summary = (
        f"{reading.machine_id} was evaluated at {reading.recorded_at:%Y-%m-%d %H:%M:%S}. "
        f"The model estimated a failure probability of {prediction.failure_probability:.2%} "
        f"with an alert level of {prediction.alert_level}."
    )
    root_cause = (
        f"The dominant pattern points to {issue}. The combination of temperature "
        f"({reading.temperature}), pressure ({reading.pressure}), vibration "
        f"({reading.vibration}), flow rate ({reading.flow_rate}), and humidity "
        f"({reading.humidity}) moved away from the healthy operating baseline."
    )
    recommended_steps = (
        f"1. Verify sensor calibration for {reading.machine_id}.\n"
        f"2. Inspect the machine for {issue}.\n"
        f"3. Review recent maintenance history and compare with similar alerts.\n"
        f"4. Execute the maintenance action: {prediction.recommended_action}"
    )
    return summary, root_cause, recommended_steps


def build_report_prompt(prediction: PredictionResult):
    reading = prediction.sensor_reading
    return (
        "You are an industrial maintenance assistant for refinery equipment.\n"
        "Use only the provided sensor values and prediction result.\n"
        "Do not invent prior maintenance history, extra machines, or unsupported causes.\n"
        "Return strict JSON with keys: summary, root_cause, recommended_steps.\n"
        "Keep each value concise and operationally useful.\n\n"
        f"Machine ID: {reading.machine_id}\n"
        f"Recorded At: {reading.recorded_at.isoformat()}\n"
        f"Temperature: {reading.temperature}\n"
        f"Pressure: {reading.pressure}\n"
        f"Vibration: {reading.vibration}\n"
        f"Flow Rate: {reading.flow_rate}\n"
        f"Humidity: {reading.humidity}\n"
        f"Predicted Failure: {prediction.predicted_failure}\n"
        f"Failure Probability: {prediction.failure_probability}\n"
        f"Alert Level: {prediction.alert_level}\n"
        f"Recommended Action: {prediction.recommended_action}\n"
        f"Explanation: {prediction.explanation}\n"
    )


def parse_openai_report_content(content: str):
    payload = json.loads(content)
    return (
        payload["summary"].strip(),
        payload["root_cause"].strip(),
        payload["recommended_steps"].strip(),
    )


def generate_openai_report_sections(prediction: PredictionResult) -> Optional[tuple[str, str, str]]:
    if prediction.alert_level == "Low":
        return None

    api_key = getattr(settings, "OPENAI_API_KEY", "")
    model_name = getattr(settings, "OPENAI_REPORT_MODEL", "")
    if not api_key or not model_name or OpenAI is None:
        return None

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model_name,
        input=build_report_prompt(prediction),
        max_output_tokens=350,
    )
    text_output = getattr(response, "output_text", "").strip()
    if not text_output:
        return None
    return parse_openai_report_content(text_output)


def create_generated_report(prediction: PredictionResult):
    summary, root_cause, recommended_steps = build_report_sections(prediction)
    source = GeneratedReport.SOURCE_RULE_BASED

    try:
        openai_sections = generate_openai_report_sections(prediction)
        if openai_sections:
            summary, root_cause, recommended_steps = openai_sections
            source = GeneratedReport.SOURCE_OPENAI
    except Exception:
        source = GeneratedReport.SOURCE_RULE_BASED

    return GeneratedReport.objects.create(
        prediction=prediction,
        title=f"Maintenance Report for {prediction.sensor_reading.machine_id}",
        summary=summary,
        root_cause=root_cause,
        recommended_steps=recommended_steps,
        generation_source=source,
    )


def create_prediction_for_reading(reading: SensorReading):
    model, metadata = load_model_bundle()
    feature_frame = build_feature_frame(reading)
    probability = float(model.predict_proba(feature_frame)[0][1])
    predicted_failure = probability >= metadata.get("decision_threshold", 0.5)
    ml_alert_level = determine_alert_level(probability)
    safety_alert_level, safety_reasons = evaluate_safety_override(reading)
    alert_level = (
        safety_alert_level
        if get_level_rank(safety_alert_level) > get_level_rank(ml_alert_level)
        else ml_alert_level
    )
    safety_override_applied = get_level_rank(alert_level) > get_level_rank(ml_alert_level)
    final_predicted_failure = predicted_failure or alert_level in {"Medium", "High"}
    recommendation = build_recommendation(reading, probability)
    explanation = build_explanation(reading, probability)
    if safety_override_applied:
        recommendation = apply_safety_override_to_recommendation(
            recommendation, safety_reasons
        )
        explanation = apply_safety_override_to_explanation(
            explanation, safety_reasons, alert_level
        )

    prediction = PredictionResult.objects.create(
        sensor_reading=reading,
        predicted_failure=final_predicted_failure,
        failure_probability=round(probability, 4),
        alert_level=alert_level,
        recommended_action=recommendation,
        explanation=explanation,
    )
    prediction.safety_override_applied = safety_override_applied
    maybe_create_alert(prediction)
    create_generated_report(prediction)
    return prediction
