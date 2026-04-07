import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../utils/api';

export default function Login() {
  const [loginType, setLoginType]       = useState('admin');
  const [showRegister, setShowRegister] = useState(false);
  const [sessionMsg, setSessionMsg]     = useState('');
  const [adminForm, setAdminForm]       = useState({ email: '', password: '' });
  const [studentForm, setStudentForm]   = useState({ identifier: '', password: '' });
  const [regForm, setRegForm]           = useState({
    studentId: '', name: '', email: '', phone: '',
    password: '', confirmPassword: '',
    dateOfBirth: '', gender: '', course: '', year: '',
    guardianName: '', guardianPhone: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalRooms: 0, occupiedRooms: 0, availableRooms: 0 });
  const { login, studentLogin, studentRegister } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const reason = sessionStorage.getItem('logout_reason');
    if (reason) { setSessionMsg(reason); sessionStorage.removeItem('logout_reason'); }
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await roomAPI.getPublicSummary();
        setSummary(response.data.data);
      } catch {
        setSummary({ totalRooms: 0, occupiedRooms: 0, availableRooms: 0 });
      }
    };
    loadSummary();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(adminForm.email, adminForm.password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await studentLogin(studentForm.identifier, studentForm.password); navigate('/student-dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault(); setError('');
    if (regForm.password !== regForm.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try { const { confirmPassword, ...data } = regForm; await studentRegister(data); navigate('/student-dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,179,67,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(83,197,163,0.12) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(126,195,255,0.12) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(165,128,82,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(165,128,82,0.06) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Main container */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        width: '90vw',
        maxWidth: 1100,
        minHeight: 600,
        borderRadius: 32,
        overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>

        {/* ── LEFT PANEL ── */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(135deg, rgba(245,179,67,0.14) 0%, rgba(255,255,255,0.7) 42%, rgba(126,195,255,0.14) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRight: '1px solid var(--glass-border)',
          padding: '52px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(124,107,255,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(124,107,255,0.1)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(45,212,191,0.1)', pointerEvents: 'none' }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 44 }}>
            <div style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, var(--accent), var(--teal))',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: '#1b130b',
              boxShadow: '0 0 40px rgba(124,107,255,0.5)',
            }}>H</div>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>HostelFlow</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Campus operations suite</div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 16 }}>
            Smarter hostel<br />
            <span style={{ background: 'linear-gradient(135deg, var(--accent-2), var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              operations
            </span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40 }}>
            Complete solution for managing hostel rooms,<br />students, allocations and fees.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
            {[
              { icon: '⬡', label: `${summary.totalRooms} Total Rooms`, sub: `${summary.occupiedRooms} occupied right now`, color: '#7c6bff' },
              { icon: '✅', label: `${summary.availableRooms} Available Rooms`, sub: 'Live availability from the hostel inventory', color: '#2dd4bf' },
              { icon: '👥', label: 'Student Portal', sub: 'Self-registration & room selection', color: '#fbbf24' },
              { icon: '🤖', label: 'AI Assistant', sub: 'Smart hostel chatbot', color: '#38bdf8' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                backdropFilter: 'blur(12px)',
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  background: `${f.color}22`,
                  border: `1px solid ${f.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Session badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: 100,
            fontSize: 11, color: 'var(--emerald)',
            fontFamily: 'var(--font-mono)',
            width: 'fit-content',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
            Live room snapshot updates from the backend
          </div>
        </div>

        {/* ── RIGHT PANEL — Login Form ── */}
        <div style={{
          width: showRegister ? 540 : 460,
          background: 'rgba(255,252,246,0.86)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          padding: '52px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflowY: 'auto',
          transition: 'width 0.3s ease',
        }}>

          {/* Session expired */}
          {sessionMsg && (
            <div style={{ background: 'var(--amber-glow)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>⏰</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>Session Expired</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sessionMsg}</div>
              </div>
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {showRegister ? '✨ Create Account' : '👋 Welcome Back'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {showRegister ? 'Fill in your details to register' : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          {/* Toggle Admin/Student */}
          {!showRegister && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, marginBottom: 28,
              padding: 5,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}>
              {[
                { key: 'admin',   icon: '👨‍💼', label: 'Admin' },
                { key: 'student', icon: '🎓', label: 'Student' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => { setLoginType(t.key); setError(''); }}
                  style={{
                    padding: '12px 16px',
                    border: 'none', cursor: 'pointer',
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                    background: loginType === t.key
                      ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)'
                      : 'transparent',
                    color: loginType === t.key ? 'white' : 'var(--text-secondary)',
                    boxShadow: loginType === t.key ? '0 4px 20px rgba(124,107,255,0.35)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(251,113,133,0.08)',
              border: '1px solid rgba(251,113,133,0.25)',
              borderRadius: 12, padding: '12px 16px',
              color: 'var(--rose)', fontSize: 13,
              marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── ADMIN LOGIN ── */}
          {loginType === 'admin' && !showRegister && (
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email Address</label>
                <input type="email" className="form-input"
                  placeholder="admin@hostel.com"
                  value={adminForm.email}
                  onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  style={{ padding: '14px 16px', fontSize: 15, borderRadius: 14 }}
                  required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
                <input type="password" className="form-input"
                  placeholder="••••••••"
                  value={adminForm.password}
                  onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                  style={{ padding: '14px 16px', fontSize: 15, borderRadius: 14 }}
                  required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ justifyContent: 'center', padding: '15px', fontSize: 15, borderRadius: 14, marginTop: 4 }}>
                {loading && <span className="loading-spinner" style={{ width: 18, height: 18 }} />}
                {loading ? 'Signing in...' : 'Sign In as Admin →'}
              </button>

              {/* Demo creds */}
              <div style={{ padding: '14px 16px', background: 'rgba(124,107,255,0.06)', border: '1px solid rgba(124,107,255,0.15)', borderRadius: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>◈ Demo Credentials</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>Email: <span style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-mono)' }}>admin@hostel.com</span></div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Password: <span style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-mono)' }}>admin123</span></div>
              </div>
            </form>
          )}

          {/* ── STUDENT LOGIN ── */}
          {loginType === 'student' && !showRegister && (
            <form onSubmit={handleStudentLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Student ID / Email / Phone</label>
                <input className="form-input"
                  placeholder="STU001 or email or phone number"
                  value={studentForm.identifier}
                  onChange={e => setStudentForm({ ...studentForm, identifier: e.target.value })}
                  style={{ padding: '14px 16px', fontSize: 15, borderRadius: 14 }}
                  required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
                <input type="password" className="form-input"
                  placeholder="••••••••"
                  value={studentForm.password}
                  onChange={e => setStudentForm({ ...studentForm, password: e.target.value })}
                  style={{ padding: '14px 16px', fontSize: 15, borderRadius: 14 }}
                  required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ justifyContent: 'center', padding: '15px', fontSize: 15, borderRadius: 14 }}>
                {loading && <span className="loading-spinner" style={{ width: 18, height: 18 }} />}
                {loading ? 'Signing in...' : 'Sign In as Student →'}
              </button>
              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>New here? </span>
                <button type="button"
                  onClick={() => { setShowRegister(true); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-2)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  Create account →
                </button>
              </div>
            </form>
          )}

          {/* ── STUDENT REGISTER ── */}
          {showRegister && (
            <form onSubmit={handleStudentRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Basic Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Student ID *</label>
                  <input className="form-input" placeholder="e.g. STU007" value={regForm.studentId} onChange={e => setRegForm({ ...regForm, studentId: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="Your full name" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" placeholder="your@email.com" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input className="form-input" placeholder="9876543210" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" placeholder="Min 6 chars" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input type="password" className="form-input" placeholder="Repeat" value={regForm.confirmPassword} onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date of Birth *</label>
                  <input type="date" className="form-input" value={regForm.dateOfBirth} onChange={e => setRegForm({ ...regForm, dateOfBirth: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select className="form-select" value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })} required>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Course *</label>
                  <input className="form-input" placeholder="e.g. B.Tech CS" value={regForm.course} onChange={e => setRegForm({ ...regForm, course: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Year *</label>
                  <select className="form-select" value={regForm.year} onChange={e => setRegForm({ ...regForm, year: e.target.value })} required>
                    <option value="">Select</option>
                    {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Guardian Name</label>
                  <input className="form-input" placeholder="Parent/Guardian" value={regForm.guardianName} onChange={e => setRegForm({ ...regForm, guardianName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Guardian Phone</label>
                  <input className="form-input" placeholder="9876543210" value={regForm.guardianPhone} onChange={e => setRegForm({ ...regForm, guardianPhone: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ justifyContent: 'center', padding: '15px', fontSize: 15, borderRadius: 14, marginTop: 4 }}>
                {loading && <span className="loading-spinner" style={{ width: 18, height: 18 }} />}
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => { setShowRegister(false); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                  ← Back to login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
