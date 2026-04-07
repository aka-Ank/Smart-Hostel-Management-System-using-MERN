import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildingAPI, roomChangeRequestAPI, studentPortalAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

const AMENITY_ICONS = {
  hasAC: '❄ AC',
  hasWifi: '📶 WiFi',
  hasAttachedBathroom: '🚿 Bathroom',
  hasBalcony: '🌿 Balcony',
  hasTV: '📺 TV'
};

export default function StudentDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState('profile');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms]     = useState(false);
  const [editForm, setEditForm]             = useState({});
  const [editing, setEditing]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [blockFilter, setBlockFilter]       = useState('');
  const [floorFilter, setFloorFilter]       = useState('');
  const [fees, setFees]                     = useState(null);
  const [toast, setToast]                   = useState(null);
  const [searchRoom, setSearchRoom]         = useState('');
  const [buildings, setBuildings]           = useState([]);
  const [requests, setRequests]             = useState([]);
  const [requestForm, setRequestForm]       = useState({ id: '', requestedRoomId: '', reason: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [feeFiles, setFeeFiles]             = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchProfile(); }, []);

  const editDirty = editing && JSON.stringify({
    name: profile?.name || '',
    phone: profile?.phone || '',
    guardianName: profile?.guardianName || '',
    guardianPhone: profile?.guardianPhone || '',
    address: profile?.address || {},
  }) !== JSON.stringify(editForm);
  const requestDirty = !!requestForm.requestedRoomId || !!requestForm.reason;
  useUnsavedChanges(editDirty || requestDirty);

  const fetchProfile = async () => {
    try {
      const res = await studentPortalAPI.getProfile();
      setProfile(res.data.data);
      setEditForm({
        name:         res.data.data.name,
        phone:        res.data.data.phone,
        guardianName: res.data.data.guardianName || '',
        guardianPhone: res.data.data.guardianPhone || '',
        address:      res.data.data.address || {},
      });
    } catch (err) {
      showToast('Failed to load profile', 'error');
    } finally { setLoading(false); }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const params = { limit: 1000, search: searchRoom };
      if (blockFilter) params.building = blockFilter;
      if (floorFilter) params.floor = floorFilter;
      const res = await studentPortalAPI.getAvailableRooms(params);
      setAvailableRooms(res.data.data);
    } catch { showToast('Failed to load rooms', 'error'); }
    finally { setLoadingRooms(false); }
  };

  const fetchFees = async () => {
    try {
      const res = await studentPortalAPI.getFees();
      setFees(res.data.data);
    } catch {}
  };

  const fetchBuildings = async () => {
    try {
      const res = await buildingAPI.getAll();
      setBuildings(res.data.data);
    } catch {}
  };

  const fetchRequests = async () => {
    try {
      const res = await roomChangeRequestAPI.getMine();
      setRequests(res.data.data);
    } catch {
      showToast('Failed to load room change requests', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'rooms' || activeTab === 'requests') fetchRooms();
    if (activeTab === 'fees' || activeTab === 'requests') fetchFees();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab, blockFilter, floorFilter, searchRoom]);

  useEffect(() => { fetchBuildings(); }, []);

  const handleSelectRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to select Room ${roomNumber}?\n\nThis CANNOT be changed later!`)) return;
    try {
      await studentPortalAPI.selectRoom(roomId);
      showToast(`Room ${roomNumber} selected successfully!`, 'success');
      fetchProfile();
      setActiveTab('profile');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to select room', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await studentPortalAPI.updateProfile(editForm);
      setProfile(res.data.data);
      setEditing(false);
      showToast(res.data.message, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  // Filter rooms by search
  const filteredRooms = availableRooms.filter(r =>
    searchRoom === '' || r.roomNumber.toLowerCase().includes(searchRoom.toLowerCase())
  );

  const handleSubmitRequest = async () => {
    if (!requestForm.requestedRoomId || !requestForm.reason.trim()) {
      return showToast('Choose a room and provide a reason', 'error');
    }
    setSubmittingRequest(true);
    try {
      const payload = { requestedRoomId: requestForm.requestedRoomId, reason: requestForm.reason.trim() };
      if (requestForm.id) {
        await roomChangeRequestAPI.updateMine(requestForm.id, payload);
        showToast('Room change request updated', 'success');
      } else {
        await roomChangeRequestAPI.create(payload);
        showToast('Room change request submitted', 'success');
      }
      setRequestForm({ id: '', requestedRoomId: '', reason: '' });
      fetchRequests();
      fetchRooms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleUploadFeeProof = async () => {
    if (feeFiles.length === 0) return showToast('Choose at least one fee proof file', 'error');
    setSubmittingRequest(true);
    try {
      const formData = new FormData();
      feeFiles.forEach((file) => formData.append('proofs', file));
      await studentPortalAPI.uploadFeeProofs(formData);
      setFeeFiles([]);
      showToast('Fee proof uploaded for admin approval', 'success');
      fetchFees();
      fetchProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload fee proof', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  const editsRemaining = profile ? profile.maxEdits - profile.editCount : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', zIndex: 1 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 999,
          background: 'rgba(255,252,246,0.99)', border: `1px solid ${toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
          borderLeft: `4px solid ${toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
          borderRadius: 'var(--r-lg)', padding: '13px 18px',
          color: 'var(--text-primary)',
          fontSize: 13, boxShadow: '0 16px 40px rgba(44,36,27,0.18)',
          animation: 'slideUp 0.25s ease',
        }}>
          <strong style={{ color: toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)' }}>{toast.type === 'error' ? '✕' : '✔'}</strong> {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ background: 'rgba(251,248,242,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/student-dashboard')}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#1d140b' }}>H</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>HostelFlow</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Student Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--accent-deep)', fontFamily: 'var(--font-mono)' }}>{profile?.studentId}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'white' }}>
            {profile?.name?.charAt(0)}
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} style={{ background: 'var(--rose-glow)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 'var(--r-sm)', padding: '6px 14px', color: 'var(--rose)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Welcome Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(245,179,67,0.14), rgba(255,255,255,0.72), rgba(83,197,163,0.12))', border: '1px solid rgba(245,179,67,0.18)', borderRadius: 'var(--r-xl)', padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Welcome, {profile?.name?.split(' ')[0]}! 👋</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{profile?.course} — Year {profile?.year}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--glass-white)', borderRadius: 'var(--r-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: profile?.room ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--font-mono)' }}>{profile?.room ? profile.room.roomNumber : 'None'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>My Room</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--glass-white)', borderRadius: 'var(--r-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: profile?.feesPaid ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--font-mono)' }}>{profile?.feesPaid ? '✅' : '❌'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fees</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--glass-white)', borderRadius: 'var(--r-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: editsRemaining > 0 ? 'var(--amber)' : 'var(--rose)', fontFamily: 'var(--font-mono)' }}>{editsRemaining}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Edits Left</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--glass-white)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', padding: 4 }}>
          {[
            { key: 'profile', label: '👤 Profile' },
            { key: 'room',    label: '🚪 My Room' },
            { key: 'rooms',   label: '🔍 Find Room', hide: !!profile?.room },
            { key: 'requests', label: '⇄ Room Change', hide: !profile?.room },
            { key: 'fees',    label: '💰 Fees' },
          ].filter(t => !t.hide).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '9px 12px', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.key ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              transition: 'all var(--t)',
              boxShadow: activeTab === tab.key ? '0 4px 14px var(--accent-glow)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-title">My Profile</div>
              {!editing && profile?.detailsApprovalStatus !== 'Approved' && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                  ✏ Edit Profile
                </button>
              )}
              {!editing && profile?.detailsApprovalStatus === 'Approved' && (
                <span style={{ fontSize: 12, color: 'var(--rose)', fontFamily: 'var(--font-mono)' }}>⚠ Locked after admin approval</span>
              )}
            </div>
            {!editing ? (
              <div className="info-grid">
                {[
                  { label: 'Student ID',    value: profile?.studentId },
                  { label: 'Full Name',     value: profile?.name },
                  { label: 'Email',         value: profile?.email },
                  { label: 'Phone',         value: profile?.phone },
                  { label: 'Gender',        value: profile?.gender },
                  { label: 'Date of Birth', value: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '—' },
                  { label: 'Course',        value: profile?.course },
                  { label: 'Year',          value: `Year ${profile?.year}` },
                  { label: 'Guardian',      value: profile?.guardianName || '—' },
                  { label: 'Guardian Phone',value: profile?.guardianPhone || '—' },
                  { label: 'City',          value: profile?.address?.city || '—' },
                  { label: 'State',         value: profile?.address?.state || '—' },
                ].map(item => (
                  <div key={item.label} className="info-item">
                    <label>{item.label}</label>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--amber-glow)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 18, fontSize: 12, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                  ⚠ Saving will return your profile to pending admin review.
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Guardian Name</label>
                    <input className="form-input" value={editForm.guardianName || ''} onChange={e => setEditForm({ ...editForm, guardianName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guardian Phone</label>
                    <input className="form-input" value={editForm.guardianPhone || ''} onChange={e => setEditForm({ ...editForm, guardianPhone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" value={editForm.address?.city || ''} onChange={e => setEditForm({ ...editForm, address: { ...editForm.address, city: e.target.value } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input" value={editForm.address?.state || ''} onChange={e => setEditForm({ ...editForm, address: { ...editForm.address, state: e.target.value } })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => {
                  if (editDirty && !window.confirm('You have unsaved changes. Do you really want to leave?')) return;
                  setEditing(false);
                  setEditForm({
                    name: profile?.name,
                    phone: profile?.phone,
                    guardianName: profile?.guardianName || '',
                    guardianPhone: profile?.guardianPhone || '',
                    address: profile?.address || {},
                  });
                }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                    {saving && <span className="loading-spinner" style={{ width: 14, height: 14 }} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MY ROOM TAB ── */}
        {activeTab === 'room' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 20 }}>My Room</div>
            {profile?.room ? (
              <div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, rgba(124,107,255,0.2), rgba(45,212,191,0.15))', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⬡</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.room.roomNumber}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{profile.room.buildingName || profile.room.block} · Floor {profile.room.floor} · {profile.room.type}</div>
                    <div style={{ marginTop: 6 }}><span className="badge badge-red" style={{ fontSize: 11 }}>🔒 Current room locked until admin approves a change request</span></div>
                  </div>
                </div>
                <div className="info-grid">
                  <div className="info-item"><label>Room Type</label><span>{profile.room.type}</span></div>
                  <div className="info-item"><label>Monthly Rent</label><span style={{ color: 'var(--emerald)' }}>₹{profile.room.monthlyRent?.toLocaleString()}</span></div>
                  <div className="info-item"><label>Building</label><span>{profile.room.buildingName || profile.room.block}</span></div>
                  <div className="info-item"><label>Floor</label><span>Floor {profile.room.floor}</span></div>
                </div>
                {profile.room.amenities && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Amenities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(AMENITY_ICONS).map(([key, label]) => (
                        <span key={key} style={{ padding: '4px 10px', background: profile.room.amenities[key] ? 'var(--emerald-glow)' : 'var(--glass-white)', border: `1px solid ${profile.room.amenities[key] ? 'rgba(52,211,153,0.3)' : 'var(--glass-border)'}`, borderRadius: 100, fontSize: 12, color: profile.room.amenities[key] ? 'var(--emerald)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {label} {profile.room.amenities[key] ? '✓' : '✗'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.room.features?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Room Features</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {profile.room.features.map((feature) => <span key={feature} className="amenity-chip">{feature}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">⬡</div>
                <div className="empty-state-title">No Room Selected</div>
                <div className="empty-state-text">Go to "Find Room" tab to select your room</div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('rooms')}>
                  Browse Available Rooms →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FIND ROOM TAB ── */}
        {activeTab === 'rooms' && !profile?.room && (
          <div>
            {/* Warning */}
            <div style={{ background: 'var(--amber-glow)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
              ⚠ Once you select a room, it is PERMANENT and cannot be changed. Choose carefully!
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 180 }}
                placeholder="Search room number e.g. A-1-01"
                value={searchRoom}
                onChange={e => setSearchRoom(e.target.value)}
              />
              <select className="form-select" style={{ width: 150 }} value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
                <option value="">All Buildings</option>
                {buildings.map(building => <option key={building._id} value={building.name}>{building.displayName || building.name}</option>)}
              </select>
              <select className="form-select" style={{ width: 130 }} value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
                <option value="">All Floors</option>
                {Array.from({ length: 20 }, (_, index) => index + 1).map(f => <option key={f} value={f}>Floor {f}</option>)}
              </select>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {filteredRooms.length} rooms
              </div>
            </div>

            {/* Room Grid */}
            {loadingRooms ? (
              <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
            ) : (
              <div className="rooms-grid">
                {filteredRooms.map(room => (
                  <div key={room._id} className="room-card">
                    <div className="room-card-header">
                      <div>
                        <div className="room-number">{room.roomNumber}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {room.buildingName || room.block} · Floor {room.floor}
                        </div>
                      </div>
                      <span className="badge badge-green">Available</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {room.occupants?.length}/{room.capacity} occupied
                    </div>
                    <div className="room-occupancy-bar">
                      <div className="room-occupancy-fill occupancy-low"
                        style={{ width: `${Math.round((room.occupants?.length / room.capacity) * 100)}%` }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--emerald)', marginBottom: 10 }}>
                      ₹{room.monthlyRent?.toLocaleString()}/month
                    </div>
                    <div className="amenities-list" style={{ marginBottom: 12 }}>
                      {Object.entries(AMENITY_ICONS).filter(([k]) => room.amenities?.[k]).map(([k, label]) => (
                        <span key={k} className="amenity-chip">{label}</span>
                      ))}
                      {(room.features || []).map((feature) => (
                        <span key={feature} className="amenity-chip">{feature}</span>
                      ))}
                    </div>
                    <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
                      onClick={() => handleSelectRoom(room._id, room.roomNumber)}>
                      Select This Room
                    </button>
                  </div>
                ))}
                {filteredRooms.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No rooms found. Try different filters.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && profile?.room && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 20 }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 12 }}>Request Room Change</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Fee approval is required first. Choose a room, preview it live, and update the request anytime before admin review.
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--glass-white)', border: '1px solid var(--glass-border)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>Current room</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{profile.room.roomNumber}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Requested Room</label>
                <select className="form-select" value={requestForm.requestedRoomId} onChange={(e) => setRequestForm((current) => ({ ...current, requestedRoomId: e.target.value }))}>
                  <option value="">Select a room</option>
                  {filteredRooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.roomNumber} · {room.buildingName || room.block} · Floor {room.floor}
                    </option>
                  ))}
                </select>
              </div>
              {requestForm.requestedRoomId && (
                <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--glass-border)', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>Requested room preview</div>
                  {(() => {
                    const selected = filteredRooms.find((room) => room._id === requestForm.requestedRoomId) || requests.find((request) => request._id === requestForm.id)?.requestedRoom;
                    return selected ? (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{selected.roomNumber}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{selected.buildingName || selected.block} · Floor {selected.floor}</div>
                      </div>
                    ) : <div style={{ color: 'var(--text-muted)' }}>Select a room to preview it.</div>;
                  })()}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-textarea" value={requestForm.reason} onChange={(e) => setRequestForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Explain why you need a room change" />
              </div>
              {fees?.feeApprovalStatus !== 'Approved' && (
                <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--amber-glow)', color: 'var(--warning-text)', border: '1px solid rgba(245,179,67,0.22)' }}>
                  Fee approval must be completed before admin can approve a room change request.
                </div>
              )}
              <button className="btn btn-primary" onClick={handleSubmitRequest} disabled={submittingRequest}>
                {submittingRequest ? 'Saving...' : requestForm.id ? 'Update Request' : 'Submit Request'}
              </button>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginBottom: 12 }}>Request History</div>
              {requests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⇄</div>
                  <div className="empty-state-title">No requests yet</div>
                  <div className="empty-state-text">Your room change history will appear here after submission.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {requests.map((request) => (
                    <div key={request._id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--r-lg)', padding: 16, background: 'var(--glass-white)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                          {request.currentRoom?.roomNumber} → {request.requestedRoom?.roomNumber}
                        </div>
                        <span className={`badge ${request.status === 'Pending' ? 'badge-yellow' : request.status === 'Approved' ? 'badge-green' : 'badge-red'}`}>{request.status}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 10 }}>{request.reason}</div>
                      {request.adminNotes && (
                        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Admin notes:</strong> {request.adminNotes}
                        </div>
                      )}
                      {request.status === 'Pending' && (
                        <div style={{ marginTop: 12 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setRequestForm({ id: request._id, requestedRoomId: request.requestedRoom?._id || '', reason: request.reason || '' })}>
                            Edit Pending Request
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FEES TAB ── */}
        {activeTab === 'fees' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 20 }}>Fee Status</div>
            {fees ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ padding: '18px 20px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)', background: 'var(--glass-white)' }}>
                  <div style={{ fontSize: 34, marginBottom: 12 }}>{fees.feeApprovalStatus === 'Approved' ? '✅' : fees.feeApprovalStatus === 'Rejected' ? '❌' : '⏳'}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: fees.feeApprovalStatus === 'Approved' ? 'var(--emerald)' : fees.feeApprovalStatus === 'Rejected' ? 'var(--rose)' : 'var(--warning-text)', marginBottom: 8 }}>
                    {fees.status}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{fees.message}</div>
                  {fees.feeRemarks && (
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Admin remarks:</strong> {fees.feeRemarks}
                    </div>
                  )}
                </div>
                <div style={{ padding: '18px 20px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)', background: 'var(--glass-white)' }}>
                  <div className="form-group">
                    <label className="form-label">Upload Fee Proof</label>
                    <input type="file" className="form-input" multiple accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={(e) => setFeeFiles(Array.from(e.target.files || []))} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Upload payment proof here. Room change approval depends on fee approval.</div>
                  </div>
                  <button className="btn btn-primary" onClick={handleUploadFeeProof} disabled={submittingRequest}>
                    {submittingRequest ? 'Uploading...' : 'Submit Fee Proof'}
                  </button>
                  {fees.proofs?.length > 0 && (
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {fees.proofs.map((proof) => (
                        <button key={proof._id} className="btn btn-secondary btn-sm" onClick={() => window.open(studentPortalAPI.feeProofUrl(proof._id), '_blank', 'noopener,noreferrer')}>
                          View {proof.originalName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="loading-overlay"><div className="loading-spinner" /></div>
            )}
          </div>
        )}
      </div>
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
    </div>
  );
}
