import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function ReportsPage({
  reports,
  availableMachines,
  reportDetail,
  openReport,
  downloadReport,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const machineId = searchParams.get("machine_id") || "";
  const reportId = searchParams.get("report_id");
  const machines = Array.from(
    new Set([
      ...((reports || []).map((report) => report.prediction.sensor_reading.machine_id)),
      ...((availableMachines || [])),
    ])
  );

  const filteredReports = machineId
    ? reports?.filter(
        (report) => report.prediction.sensor_reading.machine_id === machineId
      )
    : reports;

  useEffect(() => {
    if (reportId) {
      openReport(reportId);
    } else if (machineId && filteredReports?.length) {
      openReport(filteredReports[0].id);
    }
  }, [reportId, machineId, filteredReports?.length]);

  return (
    <section className="panel report-panel">
      <div className="panel-head">
        <h2>AI-Generated Maintenance Reports And Root Cause Analysis</h2>
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
      {machineId && (
        <p className="muted" style={{ marginTop: 0 }}>
          Showing reports for <strong>{machineId}</strong>.
        </p>
      )}
      <div className="report-layout">
        <div className="report-list">
          {filteredReports?.length ? (
            filteredReports.map((report) => (
              <div key={report.id} className="report-link">
                <strong>{report.prediction.sensor_reading.machine_id}</strong>
                <span>{report.title}</span>
                <div className="report-actions">
                  <button type="button" className="text-btn" onClick={() => openReport(report.id)}>
                    View Report
                  </button>
                  <button type="button" className="text-btn" onClick={() => downloadReport(report)}>
                    Download Report
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No reports generated yet{machineId ? ` for ${machineId}` : ""}.
            </div>
          )}
        </div>
        <div className="report-detail">
          {reportDetail ? (
            <>
              <p className="eyebrow">Report Detail</p>
              <h3>{reportDetail.title}</h3>
              <p className="muted">
                Source:{" "}
                <strong>
                  {reportDetail.generation_source === "openai"
                    ? "GenAI (OpenAI)"
                    : "Rule-based fallback"}
                </strong>
              </p>
              <div className="report-actions" style={{ marginBottom: "12px" }}>
                <button
                  type="button"
                  className="primary-btn secondary-btn"
                  onClick={() => downloadReport(reportDetail)}
                >
                  Download Report
                </button>
                <Link
                  className="text-btn-link"
                  to={`/alerts${machineId ? `?machine_id=${encodeURIComponent(machineId)}` : ""}`}
                >
                  Go To Alerts & Scheduling
                </Link>
              </div>
              <p>{reportDetail.summary}</p>
              <h4>Root Cause</h4>
              <p>{reportDetail.root_cause}</p>
              <h4>Recommended Steps</h4>
              <pre>{reportDetail.recommended_steps}</pre>
            </>
          ) : (
            <div className="empty-state">
              Select a machine and report to read the full maintenance guidance.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
