import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomAPI } from '../utils/api';
import RoomFormModal from '../components/RoomFormModal';
import { useToast } from '../components/Toast';

const STATUS_BADGE = { Available: 'badge-green', Full: 'badge-red', Maintenance: 'badge-yellow', Reserved: 'badge-blue' };

const AMENITY_ICONS = {
  hasAC: '❄ AC', hasWifi: '📶 WiFi',
  hasAttachedBathroom: '🚿 Bathroom', hasBalcony: '🌿 Balcony', hasTV: '📺 TV',
};

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    (async () => {
      try { const res = await roomAPI.getById(id); setRoom(res.data.data); }
      catch { toast('Room not found', 'error'); navigate('/rooms'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="loading-overlay"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!room) return null;

  const occ = room.occupants?.length || 0;
  const pct = Math.round((occ / room.capacity) * 100);
  const fillClass = pct >= 100 ? 'occupancy-high' : pct >= 60 ? 'occupancy-mid' : 'occupancy-low';

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/rooms')}>← Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit Room</button>
      </div>

      {/* Header */}
      <div className="detail-header mb-4">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{
            width: 68, height: 68, borderRadius: 'var(--r-lg)',
            background: 'linear-gradient(135deg, rgba(124,107,255,0.2), rgba(45,212,191,0.15))',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32
          }}>⬡</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{room.roomNumber}</h1>
              <span className={`badge ${STATUS_BADGE[room.status]}`}>{room.status}</span>
              <span className="badge badge-purple">{room.type}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
              Block {room.block} · Floor {room.floor}
            </div>
            <div className="info-grid" style={{ marginBottom: 16 }}>
              <div className="info-item"><label>Capacity</label><span>{room.capacity} students</span></div>
              <div className="info-item"><label>Occupied</label><span>{occ} students</span></div>
              <div className="info-item"><label>Free Slots</label><span style={{ color: room.capacity - occ > 0 ? 'var(--emerald)' : 'var(--rose)' }}>{room.capacity - occ}</span></div>
              <div className="info-item"><label>Monthly Rent</label><span style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>₹{room.monthlyRent?.toLocaleString()}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Occupancy</span><span>{pct}%</span>
            </div>
            <div className="room-occupancy-bar" style={{ height: 7 }}>
              <div className={`room-occupancy-fill ${fillClass}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="section-title mb-4">Amenities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(AMENITY_ICONS).map(([key, label]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 14px', background: 'var(--glass-white)',
                border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)'
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: room.amenities?.[key] ? 'var(--emerald)' : 'var(--text-muted)' }}>
                  {room.amenities?.[key] ? '✦ YES' : '— NO'}
                </span>
              </div>
            ))}
          </div>
          {room.description && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--glass-white)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {room.description}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title mb-4">Current Occupants ({occ})</div>
          {room.occupants?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {room.occupants.map(s => (
                <div key={s._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--glass-white)',
                  border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)',
                  cursor: 'pointer', transition: 'border-color var(--t)'
                }}
                  onClick={() => navigate(`/students/${s._id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,107,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0, boxShadow: '0 0 10px var(--accent-glow)' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.studentId} · {s.course}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Y{s.year}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <div className="empty-state-icon">◉</div>
              <div className="empty-state-title">No Occupants</div>
              <div className="empty-state-text">Room is currently empty</div>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <RoomFormModal room={room} onClose={() => setShowEdit(false)}
          onSave={updated => { setRoom(updated); setShowEdit(false); toast('Room updated', 'success'); }} />
      )}
    </div>
  );
}
