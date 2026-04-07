import React, { useEffect, useState } from 'react';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const INITIAL_FORM = { name: '', email: '', password: '', role: 'warden' };

export default function AdminManagement() {
  const { user } = useAuth();
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAll();
      setAdmins(response.data.data);
    } catch {
      toast('Failed to load admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminAPI.create(form);
      toast('Admin created', 'success');
      setForm(INITIAL_FORM);
      loadAdmins();
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to create admin', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (adminId, isActive) => {
    try {
      await adminAPI.updateStatus(adminId, !isActive);
      toast(`Admin ${isActive ? 'disabled' : 'enabled'}`, 'success');
      loadAdmins();
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'superadmin' ? 'minmax(320px, 420px) 1fr' : '1fr', gap: 20 }}>
      {user?.role === 'superadmin' && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 6 }}>Create Admin</div>
          <div className="section-subtitle" style={{ marginBottom: 18 }}>
            Superadmins can add new admin, warden, or operations users.
          </div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="warden">Warden</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Admin'}</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="section-title" style={{ marginBottom: 6 }}>Admin Directory</div>
        <div className="section-subtitle" style={{ marginBottom: 18 }}>
          Role-based access overview for the operations team.
        </div>
        {loading ? (
          <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {admins.map((admin) => (
              <div key={admin._id || admin.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--r-lg)', padding: 18, background: 'var(--glass-white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{admin.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{admin.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <span className="badge badge-blue">{admin.role}</span>
                    <span className={`badge ${admin.isActive ? 'badge-green' : 'badge-red'}`}>{admin.isActive ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
                {user?.role === 'superadmin' && user.email !== admin.email && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusToggle(admin._id || admin.id, admin.isActive)}>
                    {admin.isActive ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
