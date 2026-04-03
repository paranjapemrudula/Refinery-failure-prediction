export default function LandingPage({ onChooseMode }) {
  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-kicker">Refinery Intelligence Platform</p>
          <h1>
            Where plant reliability meets
            <span> predictive maintenance</span>
          </h1>
          <p className="landing-lead">
            Monitor refinery equipment, predict failures before breakdowns, and
            move from reactive maintenance to guided operational decisions.
          </p>

          <div className="landing-actions">
            <button
              type="button"
              className="landing-primary-btn"
              onClick={() => onChooseMode("login")}
            >
              Log In
            </button>
            <button
              type="button"
              className="landing-secondary-btn"
              onClick={() => onChooseMode("signup")}
            >
              Create Account
            </button>
          </div>

          <div className="landing-signal-strip" aria-hidden="true">
            <span className="signal-dot signal-dot-live" />
            <span>Live monitoring</span>
            <span className="signal-separator" />
            <span className="signal-dot signal-dot-alert" />
            <span>Risk scoring</span>
            <span className="signal-separator" />
            <span className="signal-dot signal-dot-report" />
            <span>Maintenance reports</span>
          </div>

          <div className="landing-feature-strip">
            <div className="landing-feature-card">
              <strong>Real-time Monitoring</strong>
              <span>Track machine health across pumps, compressors, and valves.</span>
            </div>
            <div className="landing-feature-card landing-feature-card-dark">
              <strong>AI Failure Prediction</strong>
              <span>Identify high-risk operating conditions before they become failures.</span>
            </div>
            <div className="landing-feature-card">
              <strong>Maintenance Workflow</strong>
              <span>Connect alerts, reports, and root cause analysis in one flow.</span>
            </div>
          </div>
        </div>

        <div className="landing-visual">
          <div className="landing-visual-main">
            <div className="landing-overlay-panel">
              <p className="landing-overlay-eyebrow">Operations Console</p>
              <h3>Built for refinery teams</h3>
              <p>
                Secure access, machine-level prediction, and fast movement into alerts
                and reports.
              </p>
            </div>

            <div className="landing-console-grid" aria-hidden="true">
              <div className="console-card console-card-tall">
                <div className="console-card-label">Unit Health</div>
                <div className="console-card-value">94.2%</div>
                <div className="console-bar">
                  <span className="console-bar-fill console-bar-fill-strong" />
                </div>
              </div>

              <div className="console-card console-card-wide">
                <div className="console-card-label">Sensor Stream</div>
                <div className="console-wave">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="console-card console-card-accent">
                <div className="console-card-label console-card-label-dark">Action Layer</div>
                <div className="console-card-dark">Predict</div>
                <div className="console-card-dark">Alert</div>
                <div className="console-card-dark">Report</div>
              </div>
            </div>

            <div className="landing-pipeline-map" aria-hidden="true">
              <div className="pipeline-node">
                <span>Sensor Input</span>
              </div>
              <div className="pipeline-connector" />
              <div className="pipeline-node">
                <span>ML Model</span>
              </div>
              <div className="pipeline-connector" />
              <div className="pipeline-node pipeline-node-alert">
                <span>Action</span>
              </div>
            </div>
          </div>

          <div className="landing-stat-row">
            <div className="landing-stat-card">
              <span>Live Monitoring</span>
              <strong>24/7</strong>
            </div>
            <div className="landing-stat-card">
              <span>Machine View</span>
              <strong>Asset-first</strong>
            </div>
            <div className="landing-stat-card">
              <span>Workflow</span>
              <strong>Predict to Repair</strong>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <strong>Refinery Monitor</strong>
            <span>Predictive maintenance for pumps, compressors, and valves.</span>
          </div>
          <div className="landing-footer-meta">
            <span>Real-time monitoring</span>
            <span>ML risk prediction</span>
            <span>Alerts and reports</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
