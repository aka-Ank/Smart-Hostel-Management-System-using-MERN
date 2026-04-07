import React, { useState, useEffect } from 'react';
import { roomAPI, roomFeatureAPI } from '../utils/api';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

const INITIAL = {
  roomNumber: '', floor: '', block: '', type: 'Triple',
  capacity: 3, monthlyRent: '', description: '', status: 'Available',
  amenities: { hasAC: false, hasWifi: true, hasAttachedBathroom: false, hasBalcony: false, hasTV: false },
  features: [],
};

export default function RoomFormModal({ room, onClose, onSave }) {
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const isEdit = !!room;
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(INITIAL));

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const res = await roomFeatureAPI.getAll();
        setFeatureOptions(res.data.data);
      } catch {}
    };
    loadFeatures();
  }, []);

  useEffect(() => {
    if (room) {
      const nextForm = {
        ...INITIAL, ...room,
        capacity: room.capacity || 3,
        type: room.type || 'Triple',
        amenities: { ...INITIAL.amenities, ...(room.amenities || {}) },
        features: room.features || [],
      };
      setForm(nextForm);
      setInitialSnapshot(JSON.stringify(nextForm));
    } else {
      setForm(INITIAL);
      setInitialSnapshot(JSON.stringify(INITIAL));
    }
  }, [room]);

  const isDirty = JSON.stringify(form) !== initialSnapshot;
  useUnsavedChanges(isDirty && !loading);

  const set        = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const setAmenity = (k, v) => setForm(p => ({ ...p, amenities: { ...p.amenities, [k]: v } }));
  const toggleFeature = (featureName) => setForm((current) => ({
    ...current,
    features: current.features.includes(featureName)
      ? current.features.filter((item) => item !== featureName)
      : [...current.features, featureName],
  }));

  const validate = () => {
    const e = {};
    if (!form.roomNumber.trim()) e.roomNumber = 'Required';
    if (form.floor === '')       e.floor       = 'Required';
    if (!form.block)             e.block       = 'Required';
    if (!form.monthlyRent)       e.monthlyRent = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), monthlyRent: Number(form.monthlyRent) };
      const res = isEdit
        ? await roomAPI.update(room._id, payload)
        : await roomAPI.create(payload);
      onSave(res.data.data);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to save' });
    } finally { setLoading(false); }
  };

  const handleAddFeature = async () => {
    const name = newFeature.trim();
    if (!name) return;
    try {
      const res = await roomFeatureAPI.create({ name });
      setFeatureOptions((current) => [...current, res.data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, features: [...current.features, res.data.data.name] }));
      setNewFeature('');
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to add feature' });
    }
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Do you really want to leave?')) return;
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '⬡ Edit Room' : '⬡ Add New Room'}</h2>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={handleClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.submit && (
              <div style={{ background: 'var(--rose-glow)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--rose)', fontSize: 13, marginBottom: 20 }}>
                {errors.submit}
              </div>
            )}

            {/* Info banner */}
            <div style={{ background: 'rgba(124,107,255,0.08)', border: '1px solid rgba(124,107,255,0.22)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--accent-deep)', fontWeight: 700 }}>Flexible Room Setup</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Room format: Building-Floor-RoomNumber, for example A-3-12
                </div>
              </div>
            </div>

            {/* Room Number & Building */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Room Number *</label>
                <input className="form-input" value={form.roomNumber}
                  onChange={e => set('roomNumber', e.target.value)}
                  placeholder="e.g. A-1-01 or C-3-12" />
                {errors.roomNumber && <p className="form-error">{errors.roomNumber}</p>}
                <p className="form-hint">Format: Building-Floor-RoomNumber</p>
              </div>
              <div className="form-group">
                <label className="form-label">Building *</label>
                <input className="form-input" value={form.block} onChange={e => set('block', e.target.value.toUpperCase())} placeholder="e.g. A or NORTH" />
                {errors.block && <p className="form-error">{errors.block}</p>}
              </div>
            </div>

            {/* Floor & Rent */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Floor *</label>
                <input type="number" className="form-input" value={form.floor} onChange={e => set('floor', e.target.value)} min="1" max="100" placeholder="3" />
                {errors.floor && <p className="form-error">{errors.floor}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Rent (₹) *</label>
                <input type="number" className="form-input" value={form.monthlyRent}
                  onChange={e => set('monthlyRent', e.target.value)}
                  placeholder="3000" min="0" />
                {errors.monthlyRent && <p className="form-error">{errors.monthlyRent}</p>}
              </div>
            </div>

            {/* Type & Capacity locked */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option>Single</option>
                  <option>Double</option>
                  <option>Triple</option>
                  <option>Dormitory</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input type="number" className="form-input" value={form.capacity} onChange={e => set('capacity', e.target.value)} min="1" max="20" />
              </div>
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Available</option>
                <option>Full</option>
                <option>Maintenance</option>
                <option>Reserved</option>
              </select>
            </div>

            {/* Amenities */}
            <div className="form-group">
              <label className="form-label">Amenities</label>
              <div className="checkbox-group">
                {[
                  { key: 'hasAC',               label: '❄ AC' },
                  { key: 'hasWifi',             label: '📶 WiFi' },
                  { key: 'hasAttachedBathroom', label: '🚿 Attached Bathroom' },
                  { key: 'hasBalcony',          label: '🌿 Balcony' },
                  { key: 'hasTV',               label: '📺 TV' },
                ].map(({ key, label }) => (
                  <label key={key} className="checkbox-item">
                    <input type="checkbox" checked={form.amenities[key]}
                      onChange={e => setAmenity(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Room Features</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="form-input" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add feature like Study Table" />
                <button type="button" className="btn btn-secondary" onClick={handleAddFeature}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {featureOptions.map((feature) => (
                  <button
                    key={feature._id}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      background: form.features.includes(feature.name) ? 'var(--surface-soft)' : 'transparent',
                      color: form.features.includes(feature.name) ? 'var(--accent-deep)' : 'var(--text-secondary)',
                    }}
                    onClick={() => toggleFeature(feature.name)}
                  >
                    {form.features.includes(feature.name) ? '✓' : '+'} {feature.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Optional notes about this room..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="loading-spinner" style={{ width: 14, height: 14 }} />}
              {isEdit ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
