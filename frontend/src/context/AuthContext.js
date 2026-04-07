import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

// ── CONSTANTS ──
const JWT_DURATION     = 2 * 60 * 60 * 1000;        // 2 hours — JWT token life
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;   // 7 days  — auto logout if no activity
const REFRESH_INTERVAL = 90 * 60 * 1000;             // 90 min  — refresh token before it expires
const WARN_BEFORE      = 5 * 60 * 1000;              // 5 min   — warn before auto logout

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(() => {
    try {
      const stored = localStorage.getItem('hostel_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading]         = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState('');

  const refreshTimerRef   = useRef(null);
  const logoutTimerRef    = useRef(null);
  const warningTimerRef   = useRef(null);
  const countdownRef      = useRef(null);
  const lastActivityRef   = useRef(Date.now());

  // ── Clear all timers ──
  const clearAllTimers = () => {
    clearInterval(refreshTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownRef.current);
  };

  // ── Logout ──
  const logout = useCallback((reason = '') => {
    clearAllTimers();
    localStorage.removeItem('hostel_token');
    localStorage.removeItem('hostel_user');
    localStorage.removeItem('hostel_login_time');
    setUser(null);
    setShowWarning(false);
    if (reason === 'expired') {
      sessionStorage.setItem('logout_reason', 'Your session expired after 7 days. Please login again.');
    } else if (reason === 'inactive') {
      sessionStorage.setItem('logout_reason', 'You were logged out due to inactivity (7 days).');
    }
    window.location.href = '/login';
  }, []);

  // ── Refresh JWT token every 90 minutes ──
  const startTokenRefresh = useCallback(() => {
    clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      try {
        const { data } = await authAPI.refresh();
        if (data.token) {
          localStorage.setItem('hostel_token', data.token);
          console.log('✅ Token refreshed silently');
        }
      } catch (err) {
        console.log('Token refresh failed — logging out');
        logout('expired');
      }
    }, REFRESH_INTERVAL);
  }, [logout]);

  // ── Start 7-day auto logout timer ──
  const startAutoLogout = useCallback((loginTime) => {
    clearTimeout(logoutTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownRef.current);

    const elapsed       = Date.now() - loginTime;
    const remaining     = SESSION_DURATION - elapsed;
    const warnAt        = remaining - WARN_BEFORE;

    if (remaining <= 0) {
      logout('expired');
      return;
    }

    // Show warning 5 min before 7-day logout
    if (warnAt > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        // Start countdown
        countdownRef.current = setInterval(() => {
          const timeLeft = (loginTime + SESSION_DURATION) - Date.now();
          if (timeLeft <= 0) {
            clearInterval(countdownRef.current);
            logout('inactive');
          } else {
            const mins = Math.floor(timeLeft / 60000);
            const secs = Math.floor((timeLeft % 60000) / 1000);
            setCountdown(`${mins}m ${secs}s`);
          }
        }, 1000);
      }, warnAt);
    } else {
      // Already in warning period
      setShowWarning(true);
    }

    // Hard logout after 7 days
    logoutTimerRef.current = setTimeout(() => {
      logout('inactive');
    }, remaining);

  }, [logout]);

  // ── Track user activity — reset 7-day timer on any activity ──
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove',  handleActivity);
    window.addEventListener('keydown',    handleActivity);
    window.addEventListener('click',      handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove',  handleActivity);
      window.removeEventListener('keydown',    handleActivity);
      window.removeEventListener('click',      handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // ── Verify token on app load ──
  useEffect(() => {
    const verifyToken = async () => {
      const token     = localStorage.getItem('hostel_token');
      const loginTime = Number(localStorage.getItem('hostel_login_time'));

      if (token && loginTime) {
        // Check if 7-day session expired
        if (Date.now() - loginTime >= SESSION_DURATION) {
          logout('expired');
          setLoading(false);
          return;
        }

        try {
          const { data } = await authAPI.me();
          setUser(data.user);
          localStorage.setItem('hostel_user', JSON.stringify(data.user));
          startTokenRefresh();
          startAutoLogout(loginTime);
        } catch {
          // Token expired (2h) — try to refresh
          try {
            const { data } = await authAPI.refresh();
            localStorage.setItem('hostel_token', data.token);
            const me = await authAPI.me();
            setUser(me.data.user);
            localStorage.setItem('hostel_user', JSON.stringify(me.data.user));
            startTokenRefresh();
            startAutoLogout(loginTime);
          } catch {
            logout('expired');
          }
        }
      }
      setLoading(false);
    };

    verifyToken();
    return () => clearAllTimers();
  }, []);

  // ── Save login data and start timers ──
  const saveSession = useCallback((data) => {
    const loginTime = Date.now();
    localStorage.setItem('hostel_token',      data.token);
    localStorage.setItem('hostel_user',       JSON.stringify(data.user));
    localStorage.setItem('hostel_login_time', String(loginTime));
    setUser(data.user);
    startTokenRefresh();
    startAutoLogout(loginTime);
  }, [startTokenRefresh, startAutoLogout]);

  // ── Admin login ──
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    saveSession(data);
    return data;
  }, [saveSession]);

  // ── Student login ──
  const studentLogin = useCallback(async (identifier, password) => {
    const { data } = await authAPI.studentLogin({ identifier, password });
    saveSession(data);
    return data;
  }, [saveSession]);

  // ── Student register ──
  const studentRegister = useCallback(async (formData) => {
    const { data } = await authAPI.studentRegister(formData);
    saveSession(data);
    return data;
  }, [saveSession]);

  // ── Extend session (user clicked Stay Logged In) ──
  const extendSession = useCallback(() => {
    const newLoginTime = Date.now();
    localStorage.setItem('hostel_login_time', String(newLoginTime));
    setShowWarning(false);
    clearInterval(countdownRef.current);
    startAutoLogout(newLoginTime);
  }, [startAutoLogout]);

  const isAdmin   = user?.userType === 'admin';
  const isStudent = user?.userType === 'student';

  return (
    <AuthContext.Provider value={{
      user, login, studentLogin, studentRegister,
      logout, loading, isAdmin, isStudent,
    }}>
      {children}

      {/* ── Auto Logout Warning Banner ── */}
      {showWarning && user && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.97), rgba(245,158,11,0.97))',
          backdropFilter: 'blur(12px)',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⏰</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1000' }}>
                Auto Logout Warning!
              </div>
              <div style={{ fontSize: 13, color: '#3a2000' }}>
                You will be automatically logged out in{' '}
                <strong style={{ fontSize: 15 }}>{countdown || '...'}</strong>
                {' '}due to 7 days session limit.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={extendSession} style={{
              padding: '9px 20px',
              background: '#1a1000',
              color: '#fbbf24',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
            }}>
              ✓ Keep Me Logged In
            </button>
            <button onClick={() => logout()} style={{
              padding: '9px 20px',
              background: 'rgba(0,0,0,0.15)',
              color: '#1a1000',
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}>
              Logout Now
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};