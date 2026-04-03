export class SensorValidationGuide {
  static RANGES = {
    temperature: {
      label: "Temperature",
      unit: "°C",
      healthyMin: 70,
      healthyMax: 90,
    },
    pressure: {
      label: "Pressure",
      unit: "PSI",
      healthyMin: 180,
      healthyMax: 220,
    },
    vibration: {
      label: "Vibration",
      unit: "mm/s",
      healthyMin: 0.2,
      healthyMax: 0.45,
    },
    flow_rate: {
      label: "Flow Rate",
      unit: "L/min",
      healthyMin: 118,
      healthyMax: 132,
    },
    humidity: {
      label: "Humidity",
      unit: "%",
      healthyMin: 40,
      healthyMax: 47,
    },
  };

  static getRangeEntries() {
    return Object.entries(this.RANGES);
  }

  static validate(form) {
    const fieldErrors = {};
    const notices = [];

    for (const [field, config] of this.getRangeEntries()) {
      const rawValue = form[field];
      const value = Number(rawValue);

      if (!Number.isFinite(value)) {
        fieldErrors[field] = `${config.label} must be a valid number.`;
        continue;
      }

      if (value === 0) {
        fieldErrors[field] = `${config.label} cannot be 0. Enter a realistic sensor value.`;
        continue;
      }

      if (value < config.healthyMin || value > config.healthyMax) {
        notices.push(
          `${config.label} is outside the healthy range of ${config.healthyMin}-${config.healthyMax} ${config.unit}.`
        );
      }
    }

    if (!String(form.machine_id || "").trim()) {
      fieldErrors.machine_id = "Select a machine before running prediction.";
    }

    return {
      isValid: Object.keys(fieldErrors).length === 0,
      fieldErrors,
      notices,
    };
  }
}
