import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  clearTokens,
  fetchDashboard,
  fetchReport,
  getAccessToken,
  login,
  resetPasswordWithOtp,
  saveTokens,
  signUp,
  submitPrediction,
  updateAlert,
  verifySignupOtp,
} from "./api";
import AlertsPage from "./pages/AlertsPage";
import TopNav from "./components/TopNav";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PredictionPage from "./pages/PredictionPage";
import ReportsPage from "./pages/ReportsPage";
import SignupPage from "./pages/SignupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { SensorValidationGuide } from "./utils/predictionGuidance";

const initialForm = {
  machine_id: "PUMP_1",
  temperature: 85,
  pressure: 210,
  vibration: 0.32,
  flow_rate: 120,
  humidity: 45,
};

const fallbackMachines = [
  "PUMP_1",
  "PUMP_2",
  "COMP_1",
  "COMP_2",
  "VALVE_1",
  "VALVE_2",
];

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrapPdfText(text, maxChars = 88) {
  const normalizedLines = String(text ?? "").split("\n");
  const wrapped = [];

  normalizedLines.forEach((line) => {
    const trimmedLine = line.trimEnd();
    if (!trimmedLine) {
      wrapped.push("");
      return;
    }

    const words = trimmedLine.split(/\s+/);
    let currentLine = "";

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (nextLine.length > maxChars) {
        if (currentLine) {
          wrapped.push(currentLine);
        }
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    });

    if (currentLine) {
      wrapped.push(currentLine);
    }
  });

  return wrapped;
}

function buildPdfReportBlob(report) {
  const lines = [
    { text: report.title, size: 18 },
    { text: "", size: 12 },
    { text: `Machine: ${report.prediction.sensor_reading.machine_id}`, size: 12 },
    { text: `Generated At: ${new Date(report.generated_at).toLocaleString()}`, size: 12 },
    {
      text: `Failure Probability: ${(report.prediction.failure_probability * 100).toFixed(1)}%`,
      size: 12,
    },
    { text: `Alert Level: ${report.prediction.alert_level}`, size: 12 },
    { text: "", size: 12 },
    { text: "Summary", size: 14 },
    ...wrapPdfText(report.summary).map((text) => ({ text, size: 12 })),
    { text: "", size: 12 },
    { text: "Root Cause Analysis", size: 14 },
    ...wrapPdfText(report.root_cause).map((text) => ({ text, size: 12 })),
    { text: "", size: 12 },
    { text: "Recommended Steps", size: 14 },
    ...wrapPdfText(report.recommended_steps).map((text) => ({ text, size: 12 })),
  ];

  const pageWidth = 595;
  const pageHeight = 842;
  const topMargin = 60;
  const bottomMargin = 60;
  const lineHeight = 18;
  const usableHeight = pageHeight - topMargin - bottomMargin;
  const maxLinesPerPage = Math.floor(usableHeight / lineHeight);
  const pages = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  const objects = [];

  function addObject(content) {
    objects.push(content);
    return objects.length;
  }

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageObjectIds = [];

  pages.forEach((pageLines) => {
    const contentLines = ["BT", "/F1 12 Tf", "36 TL"];
    let currentY = pageHeight - topMargin;

    pageLines.forEach((line) => {
      const fontSize = line.size || 12;
      contentLines.push(`/F1 ${fontSize} Tf`);
      contentLines.push(`1 0 0 1 52 ${currentY} Tm`);
      contentLines.push(`(${escapePdfText(line.text)}) Tj`);
      currentY -= lineHeight;
    });

    contentLines.push("ET");
    const stream = contentLines.join("\n");
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent PAGES_ID 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageObjectIds.push(pageId);
  });

  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>`);
  pageObjectIds.forEach((pageId, index) => {
    objects[pageId - 1] = objects[pageId - 1].replace("PAGES_ID", String(pagesId));
  });
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((objectContent, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objectContent}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function extractApiErrorMessage(error, fallback) {
  try {
    const payload = JSON.parse(error.message);
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    const firstValue = Object.values(payload)[0];
    if (Array.isArray(firstValue) && firstValue.length) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  } catch {
    if (error?.message) {
      return error.message;
    }
  }
  return fallback;
}

function AuthRoutes(props) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<LandingPage onChooseMode={(mode) => navigate(`/${mode}`)} />} />
      <Route
        path="/login"
        element={
          <LoginPage
            credentials={props.credentials}
            setCredentials={props.setCredentials}
            handleLogin={props.handleLogin}
            loginLoading={props.loginLoading}
            authError={props.authError}
            authSuccess={props.authSuccess}
            onShowSignup={() => navigate("/signup")}
            onShowResetPassword={() => navigate("/reset-password")}
          />
        }
      />
      <Route
        path="/signup"
        element={
          <SignupPage
            signupForm={props.signupForm}
            setSignupForm={props.setSignupForm}
            handleSignup={props.handleSignup}
            handleVerifySignupOtp={props.handleVerifySignupOtp}
            signupLoading={props.signupLoading}
            signupOtpLoading={props.signupOtpLoading}
            authSuccess={props.authSuccess}
            signupSetup={props.signupSetup}
            authError={props.authError}
            onShowLogin={() => navigate("/login")}
          />
        }
      />
      <Route
        path="/reset-password"
        element={
          <ResetPasswordPage
            resetForm={props.resetForm}
            setResetForm={props.setResetForm}
            handleResetPassword={props.handleResetPassword}
            resetLoading={props.resetLoading}
            authError={props.authError}
            authSuccess={props.authSuccess}
            onShowLogin={() => navigate("/login")}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell(props) {
  return (
    <div className="app-shell">
      <TopNav onLogout={props.handleLogout} />
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardPage
              dashboard={props.dashboard}
              loading={props.loading}
              selectedMachine={props.selectedMachine}
              setSelectedMachine={props.setSelectedMachine}
              loadDashboard={props.loadDashboard}
              recentlyScheduledAlert={props.alertActionSuccess}
            />
          }
        />
        <Route
          path="/prediction"
          element={
            <PredictionPage
              dashboard={props.dashboard}
              availableMachines={props.availableMachines}
              form={props.form}
              setForm={props.setForm}
              handleSubmit={props.handleSubmit}
            submitting={props.submitting}
            predictionResult={props.predictionResult}
            highRiskPopup={props.highRiskPopup}
            closeHighRiskPopup={props.closeHighRiskPopup}
            error={props.error}
            fieldErrors={props.predictionFieldErrors}
          />
          }
        />
        <Route
          path="/alerts"
          element={
            <AlertsPage
              alerts={props.dashboard?.active_alerts || []}
              reports={props.dashboard?.recent_reports || []}
              availableMachines={props.availableMachines}
              updateMaintenanceAlert={props.updateMaintenanceAlert}
              alertActionError={props.alertActionError}
              alertActionLoadingId={props.alertActionLoadingId}
              alertActionSuccess={props.alertActionSuccess}
              closeAlertActionSuccess={props.closeAlertActionSuccess}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <ReportsPage
              reports={props.dashboard?.recent_reports || []}
              availableMachines={props.availableMachines}
              reportDetail={props.reportDetail}
              openReport={props.openReport}
              downloadReport={props.downloadReport}
            />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  const [dashboard, setDashboard] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupOtpLoading, setSignupOtpLoading] = useState(false);
  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    enable_authenticator: true,
    otp_code: "",
  });
  const [signupSetup, setSignupSetup] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetForm, setResetForm] = useState({
    username: "",
    otp_code: "",
    new_password: "",
    confirm_password: "",
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [highRiskPopup, setHighRiskPopup] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [predictionFieldErrors, setPredictionFieldErrors] = useState({});
  const [alertActionError, setAlertActionError] = useState("");
  const [alertActionLoadingId, setAlertActionLoadingId] = useState(null);
  const [alertActionSuccess, setAlertActionSuccess] = useState(null);
  const availableMachines =
    dashboard?.machines?.length ? dashboard.machines : fallbackMachines;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const machineFromQuery = params.get("machine_id");
    if (machineFromQuery) {
      setForm((current) => ({ ...current, machine_id: machineFromQuery }));
    }
  }, [location.search]);

  async function loadDashboard(machineId = selectedMachine) {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboard(machineId);
      setDashboard(data);
      if (!machineId && data.machines?.length && !form.machine_id) {
        setForm((current) => ({ ...current, machine_id: data.machines[0] }));
      }
    } catch (loadError) {
      if (loadError.status === 401) {
        clearTokens();
        setIsAuthenticated(false);
        setDashboard(null);
        setAuthError("Your session expired. Please log in again.");
      } else {
        setError("Could not load dashboard data. Check that Django is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard("");
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const tokens = await login(credentials);
      saveTokens(tokens);
      setIsAuthenticated(true);
    } catch (loginError) {
      setAuthError(extractApiErrorMessage(loginError, "Invalid username or password."));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setSignupLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const response = await signUp(signupForm);
      if (response.setup_required) {
        setSignupSetup(response);
        setAuthSuccess("Account created. Verify Microsoft Authenticator OTP to activate login.");
      } else {
        setAuthSuccess("Account created. You can log in now.");
        setSignupSetup(null);
        setCredentials((current) => ({
          ...current,
          username: signupForm.username,
          password: "",
        }));
        setSignupForm({
          username: "",
          email: "",
          password: "",
          confirm_password: "",
          enable_authenticator: true,
          otp_code: "",
        });
      }
    } catch (signupError) {
      setAuthError(
        extractApiErrorMessage(
          signupError,
          "Could not create account. Check password rules and registration details."
        )
      );
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleVerifySignupOtp(event) {
    event.preventDefault();
    setSignupOtpLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      await verifySignupOtp({
        username: signupForm.username,
        otp_code: signupForm.otp_code,
      });
      setAuthSuccess("Authenticator enabled successfully. You can log in now.");
      setSignupSetup(null);
      setCredentials((current) => ({
        ...current,
        username: signupForm.username,
        password: "",
      }));
      setSignupForm({
        username: "",
        email: "",
        password: "",
        confirm_password: "",
        enable_authenticator: true,
        otp_code: "",
      });
    } catch (verifyError) {
      setAuthError(
        extractApiErrorMessage(
          verifyError,
          "Invalid Microsoft Authenticator OTP. Please try again."
        )
      );
    } finally {
      setSignupOtpLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setResetLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      await resetPasswordWithOtp(resetForm);
      setAuthSuccess("Password reset successful. You can log in now.");
      setCredentials((current) => ({
        ...current,
        username: resetForm.username,
        password: "",
      }));
      setResetForm({
        username: "",
        otp_code: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (resetError) {
      setAuthError(
        extractApiErrorMessage(
          resetError,
          "Password reset failed. Check username, OTP, and password rules."
        )
      );
    } finally {
      setResetLoading(false);
    }
  }

  function handleLogout() {
    clearTokens();
    setIsAuthenticated(false);
    setDashboard(null);
    setPredictionResult(null);
    setHighRiskPopup(null);
    setReportDetail(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setPredictionFieldErrors({});

    const validation = SensorValidationGuide.validate(form);
    if (!validation.isValid) {
      setPredictionFieldErrors(validation.fieldErrors);
      setError("Please correct the highlighted sensor values before running prediction.");
      setSubmitting(false);
      return;
    }
    try {
      const result = await submitPrediction({
        ...form,
        temperature: Number(form.temperature),
        pressure: Number(form.pressure),
        vibration: Number(form.vibration),
        flow_rate: Number(form.flow_rate),
        humidity: Number(form.humidity),
      });
      setPredictionResult(result);
      if (result.alert_level === "High") {
        setHighRiskPopup(result);
      } else {
        setHighRiskPopup(null);
      }
      if (result.report_id) {
        const report = await fetchReport(result.report_id);
        setReportDetail(report);
      }
      await loadDashboard(selectedMachine);
    } catch (submitError) {
      if (submitError.status === 401) {
        handleLogout();
        setAuthError("Please log in to continue.");
      } else {
        setError("Prediction failed. Please review the values and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openReport(reportId) {
    try {
      const report = await fetchReport(reportId);
      setReportDetail(report);
    } catch (reportError) {
      if (reportError.status === 401) {
        handleLogout();
        setAuthError("Please log in to continue.");
      } else {
        setError("Could not load the maintenance report.");
      }
    }
  }

  function downloadReport(report) {
    if (!report) {
      return;
    }
    const blob = buildPdfReportBlob(report);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.prediction.sensor_reading.machine_id}_maintenance_report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleUpdateMaintenanceAlert(alertId, payload) {
    setAlertActionLoadingId(alertId);
    setAlertActionError("");
    setAlertActionSuccess(null);
    setError("");
    try {
      const updatedAlert = await updateAlert(alertId, payload);
      setAlertActionSuccess(updatedAlert);
      await loadDashboard(selectedMachine);
    } catch (alertError) {
      if (alertError.status === 401) {
        handleLogout();
        setAuthError("Please log in to continue.");
      } else {
        setAlertActionError(
          extractApiErrorMessage(
            alertError,
            "Could not update the maintenance schedule."
          )
        );
      }
    } finally {
      setAlertActionLoadingId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <AuthRoutes
        credentials={credentials}
        setCredentials={setCredentials}
        handleLogin={handleLogin}
        loginLoading={loginLoading}
        authError={authError}
        authSuccess={authSuccess}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        handleSignup={handleSignup}
        handleVerifySignupOtp={handleVerifySignupOtp}
        signupLoading={signupLoading}
        signupOtpLoading={signupOtpLoading}
        signupSetup={signupSetup}
        resetForm={resetForm}
        setResetForm={setResetForm}
        handleResetPassword={handleResetPassword}
        resetLoading={resetLoading}
      />
    );
  }

  return (
      <AppShell
        dashboard={dashboard}
        loading={loading}
      availableMachines={availableMachines}
      selectedMachine={selectedMachine}
      setSelectedMachine={setSelectedMachine}
      loadDashboard={loadDashboard}
      form={form}
      setForm={setForm}
      handleSubmit={handleSubmit}
        submitting={submitting}
        predictionResult={predictionResult}
        highRiskPopup={highRiskPopup}
        closeHighRiskPopup={() => setHighRiskPopup(null)}
        error={error}
        predictionFieldErrors={predictionFieldErrors}
        reportDetail={reportDetail}
      openReport={openReport}
      downloadReport={downloadReport}
      updateMaintenanceAlert={handleUpdateMaintenanceAlert}
      alertActionError={alertActionError}
      alertActionLoadingId={alertActionLoadingId}
      alertActionSuccess={alertActionSuccess}
      closeAlertActionSuccess={() => setAlertActionSuccess(null)}
      handleLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
