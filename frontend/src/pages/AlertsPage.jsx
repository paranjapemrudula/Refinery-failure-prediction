import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function formatTime(value) {
  return new Date(value).toLocaleString();
}

function formatDateTimeLocal(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function AlertsPage({
  alerts,
  reports,
  availableMachines,
  updateMaintenanceAlert,
  alertActionError,
  alertActionLoadingId,
  alertActionSuccess,
  closeAlertActionSuccess,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const machineId = searchParams.get("machine_id") || "";
  const [alertDrafts, setAlertDrafts] = useState({});

  const machines = useMemo(() => {
    const discoveredMachines = Array.from(
      new Set(
        [...(alerts || []), ...(reports || [])].map(
          (item) => item.prediction.sensor_reading.machine_id
        )
      )
    );
    return discoveredMachines.length ? discoveredMachines : availableMachines || [];
  }, [alerts, reports, availableMachines]);

  const filteredAlerts = machineId
    ? alerts?.filter(
        (alert) => alert.prediction.sensor_reading.machine_id === machineId
      )
    : alerts;

  useEffect(() => {
    const nextDrafts = {};
    (filteredAlerts || []).forEach((alert) => {
      nextDrafts[alert.id] = {
        status: alert.status,
        scheduled_for: formatDateTimeLocal(alert.scheduled_for),
      };
    });
    setAlertDrafts(nextDrafts);
  }, [filteredAlerts]);

  return (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">Alerts And Scheduling</p>
          <h1>Track maintenance alerts and actively manage intervention timing.</h1>
          <p className="hero-copy">
            Select a machine to focus on its active alerts, reschedule maintenance windows,
            and keep status aligned with the field condition.
          </p>
          {machineId ? (
            <p className="muted">
              Showing alerts for <strong>{machineId}</strong>.
            </p>
          ) : null}
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Maintenance Alert Queue</h2>
          <select
            value={machineId}
            onChange={(event) => {
              const nextMachine = event.target.value;
              setSearchParams(nextMachine ? { machine_id: nextMachine } : {});
            }}
          >
            <option value="">All Machines</option>
            {machines.map((machine) => (
              <option key={machine} value={machine}>
                {machine}
              </option>
            ))}
          </select>
        </div>

        {alertActionError ? <div className="error-card">{alertActionError}</div> : null}
        {alertActionSuccess ? (
          <div className="schedule-success-popup" role="status">
            <div>
              <strong>Schedule Saved</strong>
              <p>
                {alertActionSuccess.prediction.sensor_reading.machine_id} is now set to{" "}
                <strong>{alertActionSuccess.status}</strong> for{" "}
                <strong>{formatTime(alertActionSuccess.scheduled_for)}</strong>.
              </p>
            </div>
            <button type="button" className="ghost-btn" onClick={closeAlertActionSuccess}>
              Close
            </button>
          </div>
        ) : null}

        <div className="list-stack">
          {filteredAlerts?.length ? (
            filteredAlerts.map((alert) => {
              const matchingReport = reports?.find(
                (report) =>
                  report.prediction.sensor_reading.machine_id ===
                  alert.prediction.sensor_reading.machine_id
              );
              const draft = alertDrafts[alert.id] || {
                status: alert.status,
                scheduled_for: formatDateTimeLocal(alert.scheduled_for),
              };

              return (
                <article key={alert.id} className="list-card maintenance-alert-card">
                  <div className="list-title-row">
                    <strong>{alert.prediction.sensor_reading.machine_id}</strong>
                    <span className={`status-pill status-${alert.severity.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p>Status: {alert.status}</p>
                  <p>Scheduled For: {formatTime(alert.scheduled_for)}</p>
                  <p>{alert.note}</p>

                  <div className="maintenance-editor">
                    <label>
                      <span>Update Status</span>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setAlertDrafts((current) => ({
                            ...current,
                            [alert.id]: {
                              ...draft,
                              status: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>

                    <label>
                      <span>Reschedule</span>
                      <input
                        type="datetime-local"
                        value={draft.scheduled_for}
                        onChange={(event) =>
                          setAlertDrafts((current) => ({
                            ...current,
                            [alert.id]: {
                              ...draft,
                              scheduled_for: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="primary-btn maintenance-save-btn"
                      disabled={alertActionLoadingId === alert.id}
                      onClick={() =>
                        updateMaintenanceAlert(alert.id, {
                          status: draft.status,
                          scheduled_for: draft.scheduled_for
                            ? new Date(draft.scheduled_for).toISOString()
                            : undefined,
                        })
                      }
                    >
                      {alertActionLoadingId === alert.id ? "Saving..." : "Save Schedule"}
                    </button>
                  </div>

                  <div className="report-actions">
                    <Link
                      className="text-btn-link"
                      to={`/prediction?machine_id=${encodeURIComponent(
                        alert.prediction.sensor_reading.machine_id
                      )}`}
                    >
                      Go To Prediction
                    </Link>
                    <Link
                      className="text-btn-link"
                      to={`/reports?machine_id=${encodeURIComponent(
                        alert.prediction.sensor_reading.machine_id
                      )}${matchingReport ? `&report_id=${matchingReport.id}` : ""}`}
                    >
                      Open Related Report
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              No active alerts are available{machineId ? ` for ${machineId}` : ""}.
              Run predictions to generate alert and scheduling data.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
