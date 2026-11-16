import React, { useEffect } from "react";
import Icon from "./Icon";
import useLocalStorage from "../hooks/useLocalStorage";

const ITEMS = [
  { page: "home", label: "Home", icon: "home" },
  { page: "scan", label: "Scan", icon: "qr_code_scanner" },
  { page: "create", label: "Create", icon: "add_circle" },
  { page: "history", label: "History", icon: "history" },
];

// Navigation. On phones it is a bottom bar. On desktop (lg and up) CSS turns it into a left sidebar
// that can be collapsed to icons only; the choice is remembered.
const BottomNav = ({ active, onNavigate, onOpenSettings }) => {
  const [collapsed, setCollapsed] = useLocalStorage("qr_sidebar_collapsed", false);

  // styles in index.css read this attribute to set the sidebar width
  useEffect(() => {
    if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
  }, [collapsed]);

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="nav-brand">
        <Icon name="qr_code_2" fill />
        <span className="nav-label">QR Kantha</span>
      </div>

      {ITEMS.map(({ page, label, icon }) => (
        <button
          key={page}
          title={label}
          className={`nav-btn ${active === page ? "active" : ""}`}
          aria-current={active === page ? "page" : undefined}
          onClick={() => onNavigate(page)}
        >
          <Icon name={icon} fill={active === page} />
          <span className="nav-label">{label}</span>
        </button>
      ))}

      <div className="nav-spacer" />

      <button className="nav-btn nav-extra" title="Settings" onClick={onOpenSettings}>
        <Icon name="settings" />
        <span className="nav-label">Settings</span>
      </button>
      <button
        className="nav-btn nav-toggle"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
      >
        <Icon name={collapsed ? "left_panel_open" : "left_panel_close"} />
        <span className="nav-label">Collapse</span>
      </button>
    </nav>
  );
};

export default BottomNav;
