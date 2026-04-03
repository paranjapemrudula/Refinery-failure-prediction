export default function ResetPasswordPage({
  resetForm,
  setResetForm,
  handleResetPassword,
  resetLoading,
  authError,
  authSuccess,
  onShowLogin,
}) {
  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">Microsoft Authenticator Reset</p>
        <h1>Reset Password</h1>
        <p className="hero-copy">
          Enter your username, Microsoft Authenticator OTP, and a new password to
          securely reset account access.
        </p>
        <form className="login-form" onSubmit={handleResetPassword}>
          <label>
            <span>Username or Email</span>
            <input
              type="text"
              value={resetForm.username}
              onChange={(event) =>
                setResetForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="operator_1"
            />
          </label>
          <div className="password-hint">
            Enter the registered username or email, then use the current 6-digit authenticator OTP.
          </div>
          <label>
            <span>Authenticator OTP</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={resetForm.otp_code}
              onChange={(event) =>
                setResetForm((current) => ({ ...current, otp_code: event.target.value }))
              }
              placeholder="123456"
            />
          </label>
          <label>
            <span>New Password</span>
            <input
              type="password"
              value={resetForm.new_password}
              onChange={(event) =>
                setResetForm((current) => ({ ...current, new_password: event.target.value }))
              }
              placeholder="Create a new password"
            />
          </label>
          <label>
            <span>Confirm New Password</span>
            <input
              type="password"
              value={resetForm.confirm_password}
              onChange={(event) =>
                setResetForm((current) => ({ ...current, confirm_password: event.target.value }))
              }
              placeholder="Repeat new password"
            />
          </label>
          <button className="primary-btn" type="submit" disabled={resetLoading}>
            {resetLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        <div className="auth-links">
          <button type="button" className="text-btn" onClick={onShowLogin}>
            Back to login
          </button>
        </div>
        {authSuccess && <div className="success-card">{authSuccess}</div>}
        {authError && <div className="error-card">{authError}</div>}
      </div>
    </div>
  );
}
