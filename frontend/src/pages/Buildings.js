import React, { useEffect, useState } from 'react';
import { buildingAPI, roomFeatureAPI } from '../utils/api';
import { useToast } from '../components/Toast';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

const INITIAL_FORM = {
  name: '',
  type: 'Unisex',
  floors: 5,
  roomsPerFloor: 10,
  defaultRoomType: 'Triple',
  defaultCapacity: 3,
  defaultMonthlyRent: 3000,
  defaultFeatures: [],
  amenities: {
    hasAC: false,
    hasWifi: true,
    hasAttachedBathroom: false,
    hasBalcony: false,
    hasTV: false,
  },
};

export default function Buildings() {
  const toast = useToast();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [newFeature, setNewFeature] = useState('');

  useUnsavedChanges(saving === false && JSON.stringify(form) !== JSON.stringify(INITIAL_FORM));

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const response = await buildingAPI.getAll();
      setBuildings(response.data.data);
    } catch {
      toast('Failed to load buildings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
    (async () => {
      try {
        const response = await roomFeatureAPI.getAll();
        setFeatureOptions(response.data.data);
      } catch {}
    })();
  }, []);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setAmenity = (field, value) => setForm((current) => ({
    ...current,
    amenities: { ...current.amenities, [field]: value },
  }));

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  const handleEdit = (building) => {
    setEditingId(building._id);
    setForm({
      name: building.displayName || building.name,
      type: building.type,
      floors: building.floors,
      roomsPerFloor: building.roomsPerFloor,
      defaultRoomType: building.defaultRoomType,
      defaultCapacity: building.defaultCapacity,
      defaultMonthlyRent: building.defaultMonthlyRent,
      defaultFeatures: building.defaultFeatures || [],
      amenities: { ...INITIAL_FORM.amenities, ...(building.amenities || {}) },
      isActive: building.isActive,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await buildingAPI.update(editingId, form);
        toast('Building updated', 'success');
      } else {
        await buildingAPI.create(form);
        toast('Building created with generated rooms', 'success');
      }
      resetForm();
      loadBuildings();
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to save building', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureName) => setForm((current) => ({
    ...current,
    defaultFeatures: current.defaultFeatures.includes(featureName)
      ? current.defaultFeatures.filter((item) => item !== featureName)
      : [...current.defaultFeatures, featureName],
  }));

  const handleAddFeature = async () => {
    const name = newFeature.trim();
    if (!name) return;
    try {
      const response = await roomFeatureAPI.create({ name });
      setFeatureOptions((current) => [...current, response.data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, defaultFeatures: [...current.defaultFeatures, response.data.data.name] }));
      setNewFeature('');
      toast('Room feature added', 'success');
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to add room feature', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 20, alignItems: 'start' }}>
      <div className="card">
        <div className="section-title" style={{ marginBottom: 6 }}>{editingId ? 'Edit Building' : 'Create Building'}</div>
        <div className="section-subtitle" style={{ marginBottom: 18 }}>
          Define building type, floor count, and generate room inventory automatically.
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Building Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setField('name', e.target.value.toUpperCase())} placeholder="A or NORTH" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option>Male</option>
                <option>Female</option>
                <option>Unisex</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Floors</label>
              <input type="number" min="1" max="50" className="form-input" value={form.floors} onChange={(e) => setField('floors', Number(e.target.value))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rooms Per Floor</label>
              <input type="number" min="1" max="200" className="form-input" value={form.roomsPerFloor} onChange={(e) => setField('roomsPerFloor', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rent</label>
              <input type="number" min="0" className="form-input" value={form.defaultMonthlyRent} onChange={(e) => setField('defaultMonthlyRent', Number(e.target.value))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Default Room Type</label>
              <select className="form-select" value={form.defaultRoomType} onChange={(e) => setField('defaultRoomType', e.target.value)}>
                <option>Single</option>
                <option>Double</option>
                <option>Triple</option>
                <option>Dormitory</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Default Capacity</label>
              <input type="number" min="1" max="20" className="form-input" value={form.defaultCapacity} onChange={(e) => setField('defaultCapacity', Number(e.target.value))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Amenities</label>
            <div className="checkbox-group">
              {[
                ['hasWifi', 'WiFi'],
                ['hasAC', 'AC'],
                ['hasAttachedBathroom', 'Attached Bathroom'],
                ['hasBalcony', 'Balcony'],
                ['hasTV', 'TV'],
              ].map(([key, label]) => (
                <label key={key} className="checkbox-item">
                  <input type="checkbox" checked={form.amenities[key]} onChange={(e) => setAmenity(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Default Room Features</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="form-input" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add feature like Laundry Access" />
              <button type="button" className="btn btn-secondary" onClick={handleAddFeature}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {featureOptions.map((feature) => (
                <button
                  key={feature._id}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: form.defaultFeatures.includes(feature.name) ? 'var(--surface-soft)' : 'transparent',
                    color: form.defaultFeatures.includes(feature.name) ? 'var(--accent-deep)' : 'var(--text-secondary)',
                  }}
                  onClick={() => toggleFeature(feature.name)}
                >
                  {form.defaultFeatures.includes(feature.name) ? '✓' : '+'} {feature.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Building' : 'Create Building'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginBottom: 6 }}>Building Inventory</div>
        <div className="section-subtitle" style={{ marginBottom: 18 }}>
          Dynamic hostel layout with generated room inventory and occupancy stats.
        </div>
        {loading ? (
          <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : buildings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▣</div>
            <div className="empty-state-title">No buildings configured yet</div>
            <div className="empty-state-text">Create your first building to generate floors and rooms.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {buildings.map((building) => (
              <div key={building._id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--r-lg)', padding: 18, background: 'var(--glass-white)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{building.displayName || building.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {building.type} · {building.floors} floors · {building.roomsPerFloor} rooms/floor
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(building)}>Edit</button>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue">{building.stats?.rooms || 0} rooms</span>
                  <span className="badge badge-yellow">{building.stats?.occupiedRooms || 0} occupied</span>
                  <span className="badge badge-green">₹{Number(building.defaultMonthlyRent || 0).toLocaleString()}/mo</span>
                  {building.type && <span className="badge badge-blue">{building.type}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
