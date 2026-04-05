import argparse
import csv
import math
import random
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_PATH = BASE_DIR / "data" / "seed_machine_readings.csv"
DEFAULT_OUTPUT_PATH = BASE_DIR / "data" / "synthetic_machine_readings.csv"


CSV_FIELDS = [
    "timestamp",
    "machine_id",
    "temperature",
    "pressure",
    "vibration",
    "flow_rate",
    "humidity",
    "failure",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate a larger synthetic predictive maintenance dataset."
    )
    parser.add_argument(
        "--input",
        default=str(DEFAULT_INPUT_PATH),
        help="Path to the seed CSV file.",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Path for the generated CSV file.",
    )
    parser.add_argument(
        "--rows",
        type=int,
        default=1000,
        help="Number of synthetic rows to generate.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible generation.",
    )
    return parser.parse_args()


def read_seed_rows(path):
    with open(path, newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = []
        for row in reader:
            rows.append(
                {
                    "timestamp": datetime.strptime(
                        row["timestamp"], "%Y-%m-%d %H:%M:%S"
                    ),
                    "machine_id": row["machine_id"],
                    "temperature": float(row["temperature"]),
                    "pressure": float(row["pressure"]),
                    "vibration": float(row["vibration"]),
                    "flow_rate": float(row["flow_rate"]),
                    "humidity": float(row["humidity"]),
                    "failure": int(row["failure"]),
                }
            )
    if not rows:
        raise ValueError("Seed dataset is empty.")
    return rows


def build_machine_profiles(seed_rows):
    grouped = defaultdict(list)
    for row in seed_rows:
        grouped[row["machine_id"]].append(row)

    profiles = {}
    for machine_id, rows in grouped.items():
        failure_rows = [row for row in rows if row["failure"] == 1]
        healthy_rows = [row for row in rows if row["failure"] == 0]

        if not failure_rows or not healthy_rows:
            raise ValueError(
                f"Machine '{machine_id}' must have both healthy and failure examples."
            )

        def average(metric, values):
            return sum(item[metric] for item in values) / len(values)

        profiles[machine_id] = {
            "healthy_temperature": average("temperature", healthy_rows),
            "healthy_pressure": average("pressure", healthy_rows),
            "healthy_vibration": average("vibration", healthy_rows),
            "healthy_flow_rate": average("flow_rate", healthy_rows),
            "healthy_humidity": average("humidity", healthy_rows),
            "failure_temperature": average("temperature", failure_rows),
            "failure_pressure": average("pressure", failure_rows),
            "failure_vibration": average("vibration", failure_rows),
            "failure_flow_rate": average("flow_rate", failure_rows),
            "failure_humidity": average("humidity", failure_rows),
            "machine_family": machine_id.split("_")[0],
        }
    return profiles


def weighted_choice(rng, chance):
    return 1 if rng.random() < chance else 0


def clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


def sigmoid(value):
    return 1 / (1 + math.exp(-value))


def machine_trend(machine_family, hour_index):
    cycle = math.sin(hour_index / 12.0)
    if machine_family == "PUMP":
        return cycle * 1.8
    if machine_family == "COMP":
        return cycle * 1.4
    return cycle * 1.1


def synthesize_row(rng, machine_id, profile, timestamp, hour_index):
    risk_band = rng.random()
    trend = machine_trend(profile["machine_family"], hour_index)
    if risk_band > 0.84:
        stress_center = 0.86
    elif risk_band > 0.58:
        stress_center = 0.58
    else:
        stress_center = 0.30

    stress = clamp(rng.gauss(stress_center, 0.18), 0.02, 1.12)

    healthy_temp = profile["healthy_temperature"]
    failure_temp = profile["failure_temperature"]
    healthy_pressure = profile["healthy_pressure"]
    failure_pressure = profile["failure_pressure"]
    healthy_vibration = profile["healthy_vibration"]
    failure_vibration = profile["failure_vibration"]
    healthy_flow = profile["healthy_flow_rate"]
    failure_flow = profile["failure_flow_rate"]
    healthy_humidity = profile["healthy_humidity"]
    failure_humidity = profile["failure_humidity"]

    temperature = healthy_temp + (failure_temp - healthy_temp) * stress + trend + rng.gauss(0, 2.8)
    pressure = (
        healthy_pressure
        + (failure_pressure - healthy_pressure) * stress
        + trend * 2.2
        + rng.gauss(0, 7.0)
    )
    vibration = (
        healthy_vibration
        + (failure_vibration - healthy_vibration) * stress
        + rng.gauss(0, 0.045)
    )
    flow_rate = (
        healthy_flow
        - (healthy_flow - failure_flow) * stress
        + rng.gauss(0, 4.2)
    )
    humidity = (
        healthy_humidity
        + (failure_humidity - healthy_humidity) * stress
        + rng.gauss(0, 2.4)
    )

    temperature = round(clamp(temperature, 65.0, 110.0), 2)
    pressure = round(clamp(pressure, 170.0, 270.0), 2)
    vibration = round(clamp(vibration, 0.15, 0.85), 3)
    flow_rate = round(clamp(flow_rate, 95.0, 140.0), 2)
    humidity = round(clamp(humidity, 38.0, 58.0), 2)

    temp_risk = clamp((temperature - healthy_temp) / max(failure_temp - healthy_temp, 1), 0, 1.4)
    pressure_risk = clamp(
        (pressure - healthy_pressure) / max(failure_pressure - healthy_pressure, 1), 0, 1.4
    )
    vibration_risk = clamp(
        (vibration - healthy_vibration) / max(failure_vibration - healthy_vibration, 0.01), 0, 1.5
    )
    flow_risk = clamp((healthy_flow - flow_rate) / max(healthy_flow - failure_flow, 1), 0, 1.4)
    humidity_risk = clamp(
        (humidity - healthy_humidity) / max(failure_humidity - healthy_humidity, 1), 0, 1.3
    )

    latent_risk = (
        0.26 * temp_risk
        + 0.24 * pressure_risk
        + 0.27 * vibration_risk
        + 0.15 * flow_risk
        + 0.08 * humidity_risk
        + rng.gauss(0, 0.12)
    )

    failure_probability = clamp(sigmoid((latent_risk - 0.62) * 4.8), 0.03, 0.92)
    failure = weighted_choice(rng, failure_probability)

    return {
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "machine_id": machine_id,
        "temperature": f"{temperature:.2f}",
        "pressure": f"{pressure:.2f}",
        "vibration": f"{vibration:.3f}",
        "flow_rate": f"{flow_rate:.2f}",
        "humidity": f"{humidity:.2f}",
        "failure": str(failure),
    }


def generate_rows(seed_rows, profiles, target_rows, rng):
    machine_ids = sorted(profiles)
    start_time = min(row["timestamp"] for row in seed_rows) + timedelta(days=1)
    rows = []

    for hour_index in range(target_rows):
        machine_id = machine_ids[hour_index % len(machine_ids)]
        timestamp = start_time + timedelta(hours=hour_index)
        rows.append(
            synthesize_row(
                rng=rng,
                machine_id=machine_id,
                profile=profiles[machine_id],
                timestamp=timestamp,
                hour_index=hour_index,
            )
        )
    return rows


def write_rows(path, rows):
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def summarize(rows):
    total_rows = len(rows)
    failure_rows = sum(int(row["failure"]) for row in rows)
    healthy_rows = total_rows - failure_rows
    return total_rows, healthy_rows, failure_rows


def main():
    args = parse_args()
    rng = random.Random(args.seed)

    seed_rows = read_seed_rows(args.input)
    profiles = build_machine_profiles(seed_rows)
    synthetic_rows = generate_rows(seed_rows, profiles, args.rows, rng)
    write_rows(args.output, synthetic_rows)

    total_rows, healthy_rows, failure_rows = summarize(synthetic_rows)
    print(f"Generated {total_rows} rows in {args.output}")
    print(f"Healthy rows: {healthy_rows}")
    print(f"Failure rows: {failure_rows}")


if __name__ == "__main__":
    main()
