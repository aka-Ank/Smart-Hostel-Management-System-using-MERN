import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

const NavItem = ({ to, icon, label }) => (
  <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
    <span className="nav-icon">{icon}</span>
    {label}
  </NavLink>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link to="/dashboard" className="brand-logo">
          <div className="brand-icon">H</div>
          <div className="brand-text">
            <span className="brand-name">HostelFlow</span>
            <span className="brand-tagline">Campus operations suite</span>
          </div>
        </Link>
        <div className="sidebar-summary">
          <span className="sidebar-summary-badge">Live</span>
          <p>Rooms, students, and allocations managed from one place.</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-section-label">Overview</span>
        <NavItem to="/dashboard" icon="◈" label="Dashboard" />
        <span className="nav-section-label">Management</span>
        <NavItem to="/students" icon="◉" label="Students" />
        <NavItem to="/rooms" icon="⬡" label="Rooms" />
        <NavItem to="/buildings" icon="▣" label="Buildings" />
        <NavItem to="/admins" icon="✦" label="Admins" />
        <NavItem to="/requests" icon="⇄" label="Requests" />
        <NavItem to="/allocations" icon="⟐" label="Allocations" />
      </nav>
      <div className="sidebar-footer">
        <div className="admin-info">
          <div className="admin-avatar">{user?.name?.charAt(0).toUpperCase() || 'A'}</div>
          <div className="admin-details">
            <div className="admin-name">{user?.name || 'Admin'}</div>
            <div className="admin-role">{user?.role || 'warden'}</div>
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)} title="Logout">⏻</button>
        </div>
      </div>
    </aside>
    <ConfirmModal
      open={showLogoutConfirm}
      title="Logout"
      message="Are you sure you want to logout?"
      confirmLabel="Logout"
      cancelLabel="Stay"
      tone="danger"
      onCancel={() => setShowLogoutConfirm(false)}
      onConfirm={() => logout()}
    />
    </>
  );
}
