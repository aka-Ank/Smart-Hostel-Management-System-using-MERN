import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Rooms from './pages/Rooms';
import Buildings from './pages/Buildings';
import AdminManagement from './pages/AdminManagement';
import RoomDetail from './pages/RoomDetail';
import Allocations from './pages/Allocations';
import RoomChangeRequests from './pages/RoomChangeRequests';
import StudentDashboard from './pages/StudentDashboard';
import './index.css';

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === 'student') return <Navigate to="/student-dashboard" replace />;
  return children;
}

function StudentRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Landing page — home route */}
      <Route path="/" element={
        !user ? <LandingPage /> :
        user.userType === 'admin' ? <Navigate to="/dashboard" replace /> :
        <Navigate to="/student-dashboard" replace />
      } />

      {/* Login page */}
      <Route path="/login" element={
        !user ? <Login /> :
        user.userType === 'admin' ? <Navigate to="/dashboard" replace /> :
        <Navigate to="/student-dashboard" replace />
      } />

      {/* Admin Routes */}
      <Route path="/" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="students"     element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="rooms"        element={<Rooms />} />
        <Route path="buildings"    element={<Buildings />} />
        <Route path="admins"       element={<AdminManagement />} />
        <Route path="requests"     element={<RoomChangeRequests />} />
        <Route path="rooms/:id"    element={<RoomDetail />} />
        <Route path="allocations"  element={<Allocations />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student-dashboard" element={
        <StudentRoute><StudentDashboard /></StudentRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
