import React, { useState, useEffect } from 'react';
import { studentAPI } from '../utils/api';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

const INITIAL = {
  studentId: '', name: '', email: '', phone: '',
  dateOfBirth: '', gender: '', course: '', year: '',
  guardianName: '', guardianPhone: '', status: 'Active', feesPaid: false,
  address: { street: '', city: '', state: '', pincode: '' },
};

const SectionLabel = ({ children }) => (
  <div className="sub-section-label">{children}</div>
);

export default function StudentFormModal({ student, onClose, onSave }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const isEdit = !!student;
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(INITIAL));

  useEffect(() => {
    if (student) {
      const nextForm = {
        ...INITIAL, ...student,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
        address: { ...INITIAL.address, ...(student.address || {}) },
      };
      setForm(nextForm);
      setInitialSnapshot(JSON.stringify(nextForm));
    } else {
      setForm(INITIAL);
      setInitialSnapshot(JSON.stringify(INITIAL));
    }
  }, [student]);

  const isDirty = JSON.stringify(form) !== initialSnapshot;
  useUnsavedChanges(isDirty && !loading);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const setAddr = (f, v) => setForm(p => ({ ...p, address: { ...p.address, [f]: v } }));

  const validate = () => {
    const e = {};
    if (!form.studentId.trim()) e.studentId = 'Required';
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Required';
    if (!form.gender) e.gender = 'Required';
    if (!form.course.trim()) e.course = 'Required';
    if (!form.year) e.year = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = isEdit
        ? await studentAPI.update(student._id, form)
        : await studentAPI.create(form);
      onSave(res.data.data);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to save' });
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Do you really want to leave?')) return;
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✦ Edit Student' : '✦ Register New Student'}</h2>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={handleClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.submit && (
              <div style={{ background: 'var(--rose-glow)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--rose)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
                {errors.submit}
              </div>
            )}

            <SectionLabel>Basic Information</SectionLabel>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Student ID *</label>
                <input className="form-input" value={form.studentId} onChange={e => set('studentId', e.target.value)} placeholder="e.g. STU001" />
                {errors.studentId && <p className="form-error">{errors.studentId}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="student@email.com" />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
                {errors.phone && <p className="form-error">{errors.phone}</p>}
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input type="date" className="form-input" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                {errors.dateOfBirth && <p className="form-error">{errors.dateOfBirth}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
                {errors.gender && <p className="form-error">{errors.gender}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option>Active</option><option>Inactive</option>
                  <option>Graduated</option><option>Suspended</option>
                </select>
              </div>
            </div>

            <div className="divider" />
            <SectionLabel>Academic Details</SectionLabel>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Course *</label>
                <input className="form-input" value={form.course} onChange={e => set('course', e.target.value)} placeholder="e.g. B.Tech Computer Science" />
                {errors.course && <p className="form-error">{errors.course}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Year of Study *</label>
                <select className="form-select" value={form.year} onChange={e => set('year', e.target.value)}>
                  <option value="">Select Year</option>
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                {errors.year && <p className="form-error">{errors.year}</p>}
              </div>
            </div>
            <div className="form-group">
              <label className="checkbox-item" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.feesPaid} onChange={e => set('feesPaid', e.target.checked)} />
                Fees Paid
              </label>
            </div>

            <div className="divider" />
            <SectionLabel>Guardian & Address</SectionLabel>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Guardian Name</label>
                <input className="form-input" value={form.guardianName} onChange={e => set('guardianName', e.target.value)} placeholder="Parent / Guardian name" />
              </div>
              <div className="form-group">
                <label className="form-label">Guardian Phone</label>
                <input className="form-input" value={form.guardianPhone} onChange={e => set('guardianPhone', e.target.value)} placeholder="+91 9876543210" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Street</label>
                <input className="form-input" value={form.address.street} onChange={e => setAddr('street', e.target.value)} placeholder="Street address" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.address.city} onChange={e => setAddr('city', e.target.value)} placeholder="City" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.address.state} onChange={e => setAddr('state', e.target.value)} placeholder="State" />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-input" value={form.address.pincode} onChange={e => setAddr('pincode', e.target.value)} placeholder="400001" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="loading-spinner" style={{ width: 14, height: 14 }} />}
              {isEdit ? 'Update Student' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
