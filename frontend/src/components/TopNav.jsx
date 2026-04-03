import { NavLink } from "react-router-dom";

export default function TopNav({ onLogout }) {
  return (
    <div className="top-nav">
      <div className="brand-link">Refinery Monitor</div>
      <div className="top-nav-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/prediction">Prediction</NavLink>
        <NavLink to="/alerts">Alerts</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
