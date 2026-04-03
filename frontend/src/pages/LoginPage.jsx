export default function LoginPage({
  credentials,
  setCredentials,
  handleLogin,
  loginLoading,
  authError,
  authSuccess,
  onShowSignup,
  onShowResetPassword,
}) {
  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">Secure Refinery Access</p>
        <h1>Log In</h1>
        <p className="hero-copy">
          Access refinery monitoring dashboards, alerts, and reports with your
          authorized account.
        </p>
        <form className="login-form" onSubmit={handleLogin}>
          <label>
            <span>Email or Username</span>
            <input
              type="text"
              value={credentials.username}
              onChange={(event) =>
                setCredentials((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              placeholder="operator_1"
            />
          </label>
          <div className="password-hint">
            Use the registered username or email. Usernames should start with a letter and
            cannot be only numbers.
          </div>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Enter your password"
            />
          </label>
          <button className="primary-btn" type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Login"}
          </button>
        </form>
        <div className="auth-links">
          <button type="button" className="text-btn" onClick={onShowSignup}>
            First time here? Create account
          </button>
          <button type="button" className="text-btn" onClick={onShowResetPassword}>
            Reset password with Microsoft Authenticator OTP
          </button>
        </div>
        {authSuccess && <div className="success-card">{authSuccess}</div>}
        {authError && <div className="error-card">{authError}</div>}
      </div>
    </div>
  );
}
