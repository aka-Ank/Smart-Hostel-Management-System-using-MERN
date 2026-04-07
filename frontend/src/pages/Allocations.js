import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI, roomAPI } from '../utils/api';
import { useToast } from '../components/Toast';

export default function Allocations() {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [allocateModal, setAllocateModal] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [allocating, setAllocating] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try { const res = await studentAPI.getAll({ limit: 100, search, status: 'Active' }); setStudents(res.data.data); }
    catch { toast('Failed to load students', 'error'); }
    finally { setLoadingStudents(false); }
  }, [search]);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try { const res = await roomAPI.getAll({ limit: 100 }); setRooms(res.data.data); }
    catch {}
    finally { setLoadingRooms(false); }
  }, []);

  useEffect(() => { fetchStudents(); fetchRooms(); }, [fetchStudents, fetchRooms]);
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 400); return () => clearTimeout(t); }, [searchInput]);

  const filtered = students.filter(s => {
    if (filter === 'allocated') return !!s.room;
    if (filter === 'unallocated') return !s.room;
    return true;
  });

  const availableRooms = rooms.filter(r => r.status === 'Available');
  const allocatedCount = students.filter(s => s.room).length;

  const handleAllocate = async () => {
    if (!selectedRoom || !allocateModal) return;
    setAllocating(true);
    try {
      await studentAPI.allocateRoom(allocateModal._id, selectedRoom);
      toast(`Room allocated to ${allocateModal.name}`, 'success');
      setAllocateModal(null); setSelectedRoom('');
      fetchStudents(); fetchRooms();
    } catch (err) { toast(err.response?.data?.message || 'Allocation failed', 'error'); }
    finally { setAllocating(false); }
  };

  const handleVacate = async (student) => {
    try {
      await studentAPI.vacateRoom(student._id);
      toast(`Room vacated for ${student.name}`, 'success');
      fetchStudents(); fetchRooms();
    } catch (err) { toast(err.response?.data?.message || 'Failed to vacate', 'error'); }
  };

  const segBtn = (f, label, active) => ({
    padding: '8px 16px', fontSize: 12, fontFamily: 'var(--font-mono)',
    background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--glass-white)',
    color: active ? 'white' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'transparent' : 'var(--glass-border)'}`,
    cursor: 'pointer', transition: 'all var(--t)',
    boxShadow: active ? '0 4px 14px var(--accent-glow)' : 'none'
  });

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { icon: '◉', label: 'Active Students', value: students.length, color: 'var(--accent-glow)', vc: 'var(--accent-2)' },
          { icon: '✦', label: 'Allocated', value: allocatedCount, color: 'var(--emerald-glow)', vc: 'var(--emerald)' },
          { icon: '⏳', label: 'Unallocated', value: students.length - allocatedCount, color: 'var(--rose-glow)', vc: 'var(--rose)' },
          { icon: '⬡', label: 'Available Rooms', value: availableRooms.length, color: 'var(--teal-glow)', vc: 'var(--teal)' },
        ].map((c, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: c.color }}><span style={{ fontSize: 20 }}>{c.icon}</span></div>
            <div><div className="stat-value" style={{ color: c.vc }}>{c.value}</div><div className="stat-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="search-bar mb-4">
        <div className="search-input-wrapper">
          <span className="search-icon">⌕</span>
          <input className="form-input" placeholder="Search students..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          <button style={segBtn('all', `All (${students.length})`, filter === 'all')} onClick={() => setFilter('all')}>All ({students.length})</button>
          <button style={segBtn('allocated', `Allocated (${allocatedCount})`, filter === 'allocated')} onClick={() => setFilter('allocated')}>Allocated ({allocatedCount})</button>
          <button style={segBtn('unallocated', `Unallocated`, filter === 'unallocated')} onClick={() => setFilter('unallocated')}>Unallocated ({students.length - allocatedCount})</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        {loadingStudents ? (
          <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⟐</div>
            <div className="empty-state-title">No students found</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--r-xl)' }}>
            <table>
              <thead>
                <tr><th>Student</th><th>ID</th><th>Course / Year</th><th>Room</th><th>Room Details</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0, boxShadow: '0 0 8px var(--accent-glow)' }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => navigate(`/students/${s._id}`)}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-2)', fontSize: 12 }}>{s.studentId}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{s.course}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Year {s.year}</div>
                    </td>
                    <td>
                      {s.room
                        ? <span className="badge badge-teal" style={{ cursor: 'pointer' }} onClick={() => navigate(`/rooms/${s.room._id}`)}>{s.room.roomNumber}</span>
                        : <span className="badge badge-gray">—</span>
                      }
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {s.room ? `Blk ${s.room.block} · Fl ${s.room.floor} · ${s.room.type}` : '—'}
                    </td>
                    <td>
                      {s.room
                        ? <button className="btn btn-danger btn-sm" onClick={() => handleVacate(s)}>Vacate</button>
                        : <button className="btn btn-primary btn-sm" onClick={() => { setAllocateModal(s); setSelectedRoom(''); }}>Allocate</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Room Mini Map */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">⬡ Room Availability Map</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/rooms')}>Manage Rooms</button>
        </div>
        {loadingRooms ? (
          <div className="loading-overlay" style={{ minHeight: 100 }}><div className="loading-spinner" /></div>
        ) : rooms.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}><div className="empty-state-text">No rooms</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {rooms.slice(0, 24).map(r => {
              const pct = Math.round(((r.occupants?.length || 0) / r.capacity) * 100);
              const fillClass = pct >= 100 ? 'occupancy-high' : pct >= 60 ? 'occupancy-mid' : 'occupancy-low';
              return (
                <div key={r._id} style={{
                  background: 'var(--glass-white)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--r-md)', padding: '10px 12px', cursor: 'pointer',
                  transition: 'border-color var(--t)'
                }}
                  onClick={() => navigate(`/rooms/${r._id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,107,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.roomNumber}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.block}</span>
                  </div>
                  <div className="room-occupancy-bar" style={{ marginBottom: 4 }}>
                    <div className={`room-occupancy-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>{r.occupants?.length}/{r.capacity}</span>
                    <span>{r.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Allocate Modal */}
      {allocateModal && (
        <div className="modal-overlay" onClick={() => setAllocateModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⟐ Allocate Room — {allocateModal.name}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setAllocateModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '10px 14px', background: 'var(--glass-white)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', marginBottom: 18, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{allocateModal.name}</strong>
                {' · '}{allocateModal.studentId}{' · '}{allocateModal.course} Y{allocateModal.year}
              </div>
              <div className="form-group">
                <label className="form-label">Select Available Room</label>
                <select className="form-select" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                  <option value="">Choose a room...</option>
                  {availableRooms.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber} — Block {r.block}, Fl {r.floor} ({r.type}) · {r.occupants?.length}/{r.capacity} · ₹{r.monthlyRent}/mo
                    </option>
                  ))}
                </select>
                {availableRooms.length === 0 && <p className="form-error">No available rooms. Vacate existing rooms or add new ones.</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAllocateModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!selectedRoom || allocating} onClick={handleAllocate}>
                {allocating && <span className="loading-spinner" style={{ width: 14, height: 14 }} />}
                Confirm Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
