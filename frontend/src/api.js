const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function getAccessToken() {
  return localStorage.getItem("refinery_access_token");
}

export function getRefreshToken() {
  return localStorage.getItem("refinery_refresh_token");
}

export function clearTokens() {
  localStorage.removeItem("refinery_access_token");
  localStorage.removeItem("refinery_refresh_token");
}

export function saveTokens(tokens) {
  localStorage.setItem("refinery_access_token", tokens.access);
  localStorage.setItem("refinery_refresh_token", tokens.refresh);
}

async function request(path, options = {}) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function login(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "Login failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function signUp(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "Signup failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function verifySignupOtp(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup/verify-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "OTP verification failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function resetPasswordWithOtp(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "Password reset failed");
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function fetchDashboard(machineId = "") {
  const query = machineId ? `?machine_id=${encodeURIComponent(machineId)}` : "";
  return request(`/api/dashboard/${query}`);
}

export function submitPrediction(payload) {
  return request("/api/predict/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchReport(reportId) {
  return request(`/api/reports/${reportId}/`);
}

export function updateAlert(alertId, payload) {
  return request(`/api/alerts/${alertId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
