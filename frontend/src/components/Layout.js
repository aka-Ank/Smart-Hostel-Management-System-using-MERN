import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Chatbot from './Chatbot';

const PAGE_TITLES = {
  '/dashboard':   { title: 'Dashboard',   subtitle: 'overview · operations · analytics' },
  '/students':    { title: 'Students',    subtitle: 'records · registration · management' },
  '/rooms':       { title: 'Rooms',       subtitle: 'inventory · availability · amenities' },
  '/buildings':   { title: 'Buildings',   subtitle: 'configuration · layout · occupancy' },
  '/admins':      { title: 'Admins',      subtitle: 'users · roles · access' },
  '/requests':    { title: 'Requests',    subtitle: 'room changes · approvals · proofs' },
  '/allocations': { title: 'Allocations', subtitle: 'assign · manage · track' },
};

export default function Layout() {
  const location = useLocation();
  const path     = '/' + location.pathname.split('/')[1];
  const pageInfo = PAGE_TITLES[path] || { title: 'Hostel Management', subtitle: '' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-bar">
          <div>
            <div className="top-bar-kicker">Hostel operations suite</div>
            <div className="top-bar-title">{pageInfo.title}</div>
            {pageInfo.subtitle && <div className="top-bar-subtitle">{pageInfo.subtitle}</div>}
          </div>
          <div className="top-bar-status">
            <span className="top-bar-status-dot" />
            System active
          </div>
        </header>
        <main style={{
          flex: 1,
          padding: '28px 32px',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
      <Chatbot />
    </div>
  );
}
