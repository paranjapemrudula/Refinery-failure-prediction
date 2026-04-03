import json
import os
import sys
from pathlib import Path

import django
from django.test import Client


BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "refinery_monitor.settings")
django.setup()


def main():
    client = Client()
    payload = {
        "machine_id": "PUMP_1",
        "temperature": 96,
        "pressure": 245,
        "vibration": 0.62,
        "flow_rate": 108,
        "humidity": 50,
    }
    response = client.post(
        "/api/predict/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    print(f"Status: {response.status_code}")
    print(response.content.decode())


if __name__ == "__main__":
    main()
