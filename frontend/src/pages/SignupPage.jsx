export default function SignupPage({
  signupForm,
  setSignupForm,
  handleSignup,
  handleVerifySignupOtp,
  signupLoading,
  signupOtpLoading,
  authError,
  authSuccess,
  signupSetup,
  onShowLogin,
}) {
  const qrCodeUrl = signupSetup?.otpauth_uri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        signupSetup.otpauth_uri
      )}`
    : "";

  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">New User Registration</p>
        <h1>Create Account</h1>
        <p className="hero-copy">
          Create an operator account to access dashboards, machine predictions,
          and maintenance reports.
        </p>
        <form className="login-form" onSubmit={handleSignup}>
          <label>
            <span>Username</span>
            <input
              type="text"
              value={signupForm.username}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              placeholder="operator_1"
            />
          </label>
          <div className="password-hint">
            Username must start with a letter, may include letters, numbers, and underscores,
            and cannot be only numbers.
          </div>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={signupForm.email}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="operator@example.com"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Create a strong password"
            />
          </label>
          <div className="password-hint">
            Use at least 8 characters with one uppercase letter, one lowercase
            letter, one number, and one special character.
          </div>
          <label>
            <span>Confirm Password</span>
            <input
              type="password"
              value={signupForm.confirm_password}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  confirm_password: event.target.value,
                }))
              }
              placeholder="Repeat your password"
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={signupForm.enable_authenticator}
              onChange={(event) =>
                setSignupForm((current) => ({
                  ...current,
                  enable_authenticator: event.target.checked,
                }))
              }
            />
            <span>Enable Microsoft Authenticator OTP during registration</span>
          </label>
          <button className="primary-btn" type="submit" disabled={signupLoading}>
            {signupLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        {signupSetup ? (
          <div className="auth-setup-card">
            <strong>Microsoft Authenticator Setup</strong>
            <p>
              Scan this QR code in Microsoft Authenticator. If scanning is not available,
              use the manual key shown below, then enter the 6-digit OTP to activate your account.
            </p>
            <div className="setup-qr-wrap">
              <img
                className="setup-qr-image"
                src={qrCodeUrl}
                alt="Microsoft Authenticator QR code"
              />
            </div>
            <div className="setup-secret">{signupSetup.manual_key}</div>
            <div className="setup-uri">{signupSetup.otpauth_uri}</div>
            <form className="login-form" onSubmit={handleVerifySignupOtp}>
              <label>
                <span>Authenticator OTP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={signupForm.otp_code}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      otp_code: event.target.value,
                    }))
                  }
                  placeholder="123456"
                />
              </label>
              <button className="primary-btn" type="submit" disabled={signupOtpLoading}>
                {signupOtpLoading ? "Verifying..." : "Verify And Activate"}
              </button>
            </form>
          </div>
        ) : null}
        <div className="auth-links">
          <button type="button" className="text-btn" onClick={onShowLogin}>
            Already registered? Log in
          </button>
        </div>
        {authSuccess && <div className="success-card">{authSuccess}</div>}
        {authError && <div className="error-card">{authError}</div>}
      </div>
    </div>
  );
}
