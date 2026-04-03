import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

function formatTime(value) {
  return new Date(value).toLocaleTimeString();
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString();
}

function SensorCard({ icon, label, value, unit, min, max, tone, status }) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : 1;
  const safeValue = Number.isFinite(value) ? value : 0;
  const ratio = Math.max(0, Math.min(100, ((safeValue - safeMin) / Math.max(safeMax - safeMin, 1)) * 100));

  return (
    <div className={`sensor-card sensor-${tone}`}>
      <div className="sensor-card-head">
        <div className="sensor-icon">{icon}</div>
        <span className={`sensor-trend sensor-trend-${tone}`}>{tone === "vibration" ? "↗" : "—"}</span>
      </div>
      <p className="sensor-label">{label}</p>
      <div className="sensor-value-row">
        <strong>{Number.isFinite(value) ? value.toFixed(tone === "vibration" ? 2 : 1) : "N/A"}</strong>
        <span>{unit}</span>
      </div>
      <div className="sensor-range">
        <span>Min: {Number.isFinite(min) ? min.toFixed(tone === "vibration" ? 2 : 0) : "N/A"}</span>
        <span>Max: {Number.isFinite(max) ? max.toFixed(tone === "vibration" ? 2 : 0) : "N/A"}</span>
      </div>
      <div className="sensor-progress">
        <div className="sensor-progress-fill" style={{ width: `${ratio}%` }} />
      </div>
      <p className="sensor-status">{status}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="chart-tooltip dashboard-tooltip">
      <h4>{row.machine_id}</h4>
      <p>{formatTimestamp(label)}</p>
      <p>Temperature: {row.temperature}</p>
      <p>Pressure: {row.pressure}</p>
      <p>Vibration: {row.vibration}</p>
      <p>Flow Rate: {row.flow_rate}</p>
      <p>Humidity: {row.humidity}</p>
    </div>
  );
}

function getStatus(value, warningThreshold, criticalThreshold, inverse = false) {
  if (!Number.isFinite(value)) {
    return "No data";
  }

  if (inverse) {
    if (value <= criticalThreshold) {
      return "Attention";
    }
    if (value <= warningThreshold) {
      return "Watch";
    }
    return "Normal";
  }

  if (value >= criticalThreshold) {
    return "Attention";
  }
  if (value >= warningThreshold) {
    return "Watch";
  }
  return "Normal";
}

export default function DashboardPage({
  dashboard,
  loading,
  selectedMachine,
  setSelectedMachine,
  loadDashboard,
  recentlyScheduledAlert,
}) {
  const chartData = dashboard?.chart_data || [];
  const latest = chartData[chartData.length - 1];
  const temperatures = chartData.map((row) => row.temperature);
  const pressures = chartData.map((row) => row.pressure);
  const vibrations = chartData.map((row) => row.vibration);

  const latestTemperature = latest?.temperature;
  const latestPressure = latest?.pressure;
  const latestVibration = latest?.vibration;
  const activeAlerts = dashboard?.active_alerts || [];
  const machineCount = dashboard?.machines?.length || 0;
  const recordsCount = chartData.length;
  const primarySchedule = activeAlerts[0];

  const systemStatus =
    latestTemperature >= 95 || latestPressure >= 235 || latestVibration >= 0.55
      ? "Attention Needed"
      : "Operational";

  return (
    <div className="dashboard-shell">
      <header className="dashboard-hero">
        <div className="dashboard-hero-main">
          <div className="dashboard-title-wrap">
            <div className="dashboard-brand-icon">RM</div>
            <div>
              <p className="eyebrow">Live Operations Console</p>
              <h1>Refinery Management System</h1>
              <p>Real-time monitoring for temperature, pressure, vibration, and machine health.</p>
            </div>
          </div>

          <div className="dashboard-signal-strip">
            <div className="dashboard-signal-card">
              <span>Monitored Units</span>
              <strong>{machineCount}</strong>
            </div>
            <div className="dashboard-signal-card">
              <span>Sensor Records</span>
              <strong>{recordsCount}</strong>
            </div>
            <div className="dashboard-signal-card">
              <span>Current View</span>
              <strong>{selectedMachine || "All Machines"}</strong>
            </div>
            <div className="dashboard-signal-card dashboard-signal-card-alert">
              <span>Active Alerts</span>
              <strong>{activeAlerts.length}</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-status-cluster">
          <div className="dashboard-hero-aside">
            <div className={`system-status ${systemStatus === "Operational" ? "status-ok" : "status-alert"}`}>
              <span className="status-live-dot" />
              {systemStatus}
            </div>
            <div className="dashboard-updated">
              <span>Last Updated</span>
              <strong>{latest?.timestamp ? formatTimestamp(latest.timestamp) : "N/A"}</strong>
            </div>
            <div className="dashboard-focus-note">
              <span>Attention Window</span>
              <strong>
                {primarySchedule ? formatTimestamp(primarySchedule.scheduled_for) : "No scheduled work"}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {recentlyScheduledAlert ? (
        <section className="dashboard-schedule-banner">
          <div>
            <p className="eyebrow">Latest Maintenance Update</p>
            <strong>
              {recentlyScheduledAlert.prediction.sensor_reading.machine_id} scheduled for{" "}
              {formatTimestamp(recentlyScheduledAlert.scheduled_for)}
            </strong>
            <p className="muted">
              Status updated to {recentlyScheduledAlert.status}. The maintenance plan is now
              reflected in the alert workflow.
            </p>
          </div>
        </section>
      ) : null}

      <section className="dashboard-top-grid">
        <div className="dashboard-filter-card dashboard-filter-panel">
          <label htmlFor="machineFilter">Machine Filter</label>
          <select
            id="machineFilter"
            value={selectedMachine}
            onChange={(event) => {
              const machineId = event.target.value;
              setSelectedMachine(machineId);
              loadDashboard(machineId);
            }}
          >
            <option value="">All Machines</option>
            {dashboard?.machines?.map((machine) => (
              <option key={machine} value={machine}>
                {machine}
              </option>
            ))}
          </select>
          <p className="muted">
            Switch machine context without pushing the trend panels lower down the page.
          </p>
        </div>

        <div className="dashboard-panel dashboard-schedule-panel">
          <div className="panel-head">
            <div className="dashboard-schedule-headline">
              <div className="dashboard-schedule-badge" aria-hidden="true">
                <span>🚨</span>
              </div>
              <p className="eyebrow">Maintenance Schedule</p>
              <h2>Upcoming and active maintenance work</h2>
            </div>
            <Link
              className="text-btn-link"
              to={selectedMachine ? `/alerts?machine_id=${encodeURIComponent(selectedMachine)}` : "/alerts"}
            >
              Open Scheduler
            </Link>
          </div>

          {activeAlerts.length ? (
            <div className="dashboard-schedule-list">
              {activeAlerts.map((alert) => (
                <article key={alert.id} className="list-card dashboard-schedule-card">
                  <div className="list-title-row">
                    <strong>{alert.prediction.sensor_reading.machine_id}</strong>
                    <span className={`status-pill status-${alert.severity.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p>
                    Scheduled for <strong>{formatTimestamp(alert.scheduled_for)}</strong>
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No maintenance schedule is available{selectedMachine ? ` for ${selectedMachine}` : ""}.
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="panel dashboard-panel">
          <div className="empty-state">Loading dashboard data...</div>
        </div>
      ) : (
        <>
          <section className="sensor-card-grid">
            <SensorCard
              icon="T"
              label="Temperature"
              value={latestTemperature}
              unit="°C"
              min={Math.min(...temperatures)}
              max={Math.max(...temperatures)}
              tone="temperature"
              status={getStatus(latestTemperature, 88, 95)}
            />
            <SensorCard
              icon="P"
              label="Pressure"
              value={latestPressure}
              unit="PSI"
              min={Math.min(...pressures)}
              max={Math.max(...pressures)}
              tone="pressure"
              status={getStatus(latestPressure, 220, 235)}
            />
            <SensorCard
              icon="V"
              label="Vibration"
              value={latestVibration}
              unit="mm/s"
              min={Math.min(...vibrations)}
              max={Math.max(...vibrations)}
              tone="vibration"
              status={getStatus(latestVibration, 0.45, 0.55)}
            />
          </section>

          <section className="dashboard-chart-grid">
            <div className="dashboard-chart-card">
              <h3>Temperature Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="temperature" stroke="#ff4d4f" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="dashboard-chart-card">
              <h3>Pressure Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pressure"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.16}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="dashboard-chart-card dashboard-chart-card-wide">
              <h3>Vibration Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="vibration" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
