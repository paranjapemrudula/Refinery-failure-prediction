import { Link } from "react-router-dom";

export default function PredictionPage({
  dashboard,
  availableMachines,
  form,
  setForm,
  handleSubmit,
  submitting,
  predictionResult,
  highRiskPopup,
  closeHighRiskPopup,
  error,
  fieldErrors,
}) {
  const machines = availableMachines?.length
    ? availableMachines
    : ["PUMP_1", "PUMP_2", "COMP_1", "COMP_2", "VALVE_1", "VALVE_2"];
  const recentPredictions = dashboard?.latest_predictions?.slice(0, 3) || [];
  const modelMetrics = dashboard?.model_metrics || {};

  function getAlertTone(level) {
    if (level === "High") {
      return "status-high";
    }
    if (level === "Medium") {
      return "status-medium";
    }
    return "status-low";
  }

  function getResultTone(level) {
    if (level === "High") {
      return "result-tone-high";
    }
    if (level === "Medium") {
      return "result-tone-medium";
    }
    return "result-tone-low";
  }

  return (
    <>
      {highRiskPopup ? (
        <div className="modal-overlay" role="presentation" onClick={closeHighRiskPopup}>
          <div
            className="alert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="high-risk-alert-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="alert-modal-head">
              <div>
                <p className="eyebrow">Immediate Attention</p>
                <h2 id="high-risk-alert-title">High Risk Alert Detected</h2>
              </div>
              <button type="button" className="ghost-btn" onClick={closeHighRiskPopup}>
                Close
              </button>
            </div>
            <p className="alert-modal-copy">
              {highRiskPopup.machine_id} is showing a high-risk condition and should be reviewed
              immediately.
            </p>
            <div className="alert-modal-metrics">
              <div className="metric-mini-card metric-mini-card-danger">
                <span>Machine</span>
                <strong>{highRiskPopup.machine_id}</strong>
              </div>
              <div className="metric-mini-card metric-mini-card-danger">
                <span>Failure Probability</span>
                <strong>{(highRiskPopup.failure_probability * 100).toFixed(1)}%</strong>
              </div>
            </div>
            {highRiskPopup.safety_override_applied ? (
              <div className="safety-override-badge">Safety Override Applied</div>
            ) : null}
            <p className="alert-modal-copy">{highRiskPopup.explanation}</p>
            <div className="alert-modal-actions">
              <Link
                className="primary-btn secondary-btn"
                to={`/alerts?machine_id=${encodeURIComponent(highRiskPopup.machine_id)}`}
                onClick={closeHighRiskPopup}
              >
                Check Alerts & Maintenance
              </Link>
              <Link
                className="ghost-btn"
                to={`/reports?machine_id=${encodeURIComponent(highRiskPopup.machine_id)}${
                  highRiskPopup.report_id ? `&report_id=${highRiskPopup.report_id}` : ""
                }`}
                onClick={closeHighRiskPopup}
              >
                Check Report
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <header className="hero">
        <div>
          <p className="eyebrow">ML Failure Prediction</p>
          <h1>Predict equipment failure risk from operator-entered sensor values.</h1>
          <p className="hero-copy">
            Select the machine first, then submit temperature, pressure, vibration,
            flow rate, and humidity to evaluate its health using the trained ML model.
          </p>
        </div>
      </header>

      <section className="controls-row">
        <div className="panel form-panel">
          <div className="panel-head">
            <h2>Prediction Input</h2>
          </div>
          <form className="prediction-form" onSubmit={handleSubmit}>
            {Object.entries(form).map(([key, value]) => (
              <label key={key}>
                <span>{key.replaceAll("_", " ")}</span>
                {key === "machine_id" ? (
                  <select
                    className={fieldErrors?.[key] ? "input-error" : ""}
                    value={value}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                  >
                    {!machines.includes(value) && value ? (
                      <option value={value}>{value}</option>
                    ) : null}
                    {machines.map((machine) => (
                      <option key={machine} value={machine}>
                        {machine}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    step={key === "vibration" ? "0.001" : "0.01"}
                    className={fieldErrors?.[key] ? "input-error" : ""}
                    value={value}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                )}
                {fieldErrors?.[key] ? (
                  <small className="field-error-text">{fieldErrors[key]}</small>
                ) : null}
              </label>
            ))}
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? "Predicting..." : "Run Failure Prediction"}
            </button>
          </form>
          <p className="muted">
            The selected machine stays consistent with alerts and reports across the app.
          </p>
          <div className="hint-strip">
            <div>
              <strong>Operator flow</strong>
              <span>
                Choose the machine, enter the latest measured values, then move straight to
                alerts or maintenance reports for the same equipment.
              </span>
            </div>
          </div>
          {predictionResult && (
            <div className={`result-card result-card-${predictionResult.alert_level.toLowerCase()}`}>
              <div className="list-title-row">
                <h3>{predictionResult.machine_id}</h3>
                <span className={`status-pill ${getAlertTone(predictionResult.alert_level)}`}>
                  {predictionResult.alert_level} Alert
                </span>
              </div>
              <p className={`result-badge ${getResultTone(predictionResult.alert_level)}`}>
                {predictionResult.prediction}
              </p>
              {predictionResult.safety_override_applied ? (
                <div className="safety-override-badge">Safety Override Applied</div>
              ) : null}
              <p>
                Failure probability:{" "}
                {(predictionResult.failure_probability * 100).toFixed(1)}%
              </p>
              <p>{predictionResult.explanation}</p>
              <div className="report-actions">
                <Link
                  className="text-btn-link"
                  to={`/alerts?machine_id=${encodeURIComponent(predictionResult.machine_id)}`}
                >
                  View Alerts & Scheduling
                </Link>
                <Link
                  className="text-btn-link"
                  to={`/reports?machine_id=${encodeURIComponent(predictionResult.machine_id)}${
                    predictionResult.report_id ? `&report_id=${predictionResult.report_id}` : ""
                  }`}
                >
                  View Maintenance Reports
                </Link>
              </div>
            </div>
          )}
          {error && <div className="error-card">{error}</div>}
        </div>

        <div className="panel prediction-side-panel">
          <div className="panel-head">
            <h2>Healthy Machinery Parameter Guide</h2>
          </div>
          <div className="mini-insight-card">
            <strong>Reference ranges</strong>
            <p>
              These ranges are only for reference. Focus on the predicted risk result and alert
              level to decide whether the machine is in low, medium, or high risk condition.
            </p>
          </div>
          <div className="range-guide-card range-guide-card-side">
            <div className="range-guide-grid">
              <div className="range-guide-row">
                <span>Temperature</span>
                <span>70-90 °C</span>
              </div>
              <div className="range-guide-row">
                <span>Pressure</span>
                <span>180-220 PSI</span>
              </div>
              <div className="range-guide-row">
                <span>Vibration</span>
                <span>0.20-0.45 mm/s</span>
              </div>
              <div className="range-guide-row">
                <span>Flow Rate</span>
                <span>118-132 L/min</span>
              </div>
              <div className="range-guide-row">
                <span>Humidity</span>
                <span>40-47 %</span>
              </div>
            </div>
            <p className="muted">
              Values outside the healthy range may still be submitted if they remain realistic,
              but the form will stop impossible values such as 0 or values outside allowed limits.
            </p>
            <div className="metric-mini-grid">
              <div className="metric-mini-card">
                <span>Accuracy</span>
                <strong>
                  {typeof modelMetrics.accuracy === "number"
                    ? `${(modelMetrics.accuracy * 100).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </div>
              <div className="metric-mini-card">
                <span>Precision</span>
                <strong>
                  {typeof modelMetrics.precision === "number"
                    ? `${(modelMetrics.precision * 100).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </div>
              <div className="metric-mini-card">
                <span>Recall</span>
                <strong>
                  {typeof modelMetrics.recall === "number"
                    ? `${(modelMetrics.recall * 100).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </div>
              <div className="metric-mini-card">
                <span>F1 Score</span>
                <strong>
                  {typeof modelMetrics.f1_score === "number"
                    ? `${(modelMetrics.f1_score * 100).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </div>
              <div className="metric-mini-card">
                <span>Model</span>
                <strong>{modelMetrics.model_type || "N/A"}</strong>
              </div>
              <div className="metric-mini-card">
                <span>Threshold</span>
                <strong>
                  {typeof modelMetrics.threshold === "number"
                    ? modelMetrics.threshold.toFixed(2)
                    : "N/A"}
                </strong>
              </div>
              <div className="metric-mini-card">
                <span>Features</span>
                <strong>
                  {modelMetrics.feature_count ?? "N/A"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel recent-predictions-panel">
        <div className="panel-head">
          <h2>Recent Prediction Results</h2>
          <span className="muted">Showing the latest 3 entries</span>
        </div>
        {recentPredictions.length ? (
          <div className="horizontal-card-row">
            {recentPredictions.map((item) => (
              <article key={item.id} className="list-card horizontal-result-card">
                <div className="list-title-row">
                  <strong>{item.sensor_reading.machine_id}</strong>
                  <span className={`status-pill ${getAlertTone(item.alert_level)}`}>
                    {item.predicted_failure ? "Failure Risk" : "Healthy"}
                  </span>
                </div>
                <p>
                  Probability {(item.failure_probability * 100).toFixed(1)}% • Alert{" "}
                  {item.alert_level}
                </p>
                <p>{item.explanation}</p>
                <div className="report-actions">
                  <Link
                    className="text-btn-link"
                    to={`/alerts?machine_id=${encodeURIComponent(item.sensor_reading.machine_id)}`}
                  >
                    Open Alerts
                  </Link>
                  <Link
                    className="text-btn-link"
                    to={`/reports?machine_id=${encodeURIComponent(item.sensor_reading.machine_id)}`}
                  >
                    Open Reports
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No predictions available yet.</div>
        )}
      </section>
    </>
  );
}
