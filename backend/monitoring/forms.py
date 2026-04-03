from django import forms

from .models import SensorReading


class SensorReadingForm(forms.ModelForm):
    class Meta:
        model = SensorReading
        fields = [
            "machine_id",
            "temperature",
            "pressure",
            "vibration",
            "flow_rate",
            "humidity",
        ]
        widgets = {
            "machine_id": forms.TextInput(
                attrs={"class": "form-control", "placeholder": "PUMP_1"}
            ),
            "temperature": forms.NumberInput(
                attrs={"class": "form-control", "step": "0.01"}
            ),
            "pressure": forms.NumberInput(
                attrs={"class": "form-control", "step": "0.01"}
            ),
            "vibration": forms.NumberInput(
                attrs={"class": "form-control", "step": "0.001"}
            ),
            "flow_rate": forms.NumberInput(
                attrs={"class": "form-control", "step": "0.01"}
            ),
            "humidity": forms.NumberInput(
                attrs={"class": "form-control", "step": "0.01"}
            ),
        }
