import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { roomAPI, studentAPI } from '../utils/api';

const COLORS = ['#7c6bff', '#2dd4bf', '#fbbf24', '#fb7185', '#38bdf8', '#34d399'];

const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,252,246,0.96)',
      border: '1px solid var(--glass-border-strong)',
      borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 12,
      backdropFilter: 'blur(20px)', boxShadow: '0 12px 24px rgba(114,78,32,0.1)',
    }}>
      {label && <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

// Mini stat card
const StatCard = ({ icon, label, value, color, valueColor, subtitle, onClick }) => (
  <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-icon" style={{ background: color, minWidth: 50, height: 50 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="stat-value" style={{ color: valueColor, fontSize: 28 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats]               = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const navigate = useNavigate();

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, studentsRes] = await Promise.all([
        roomAPI.getStats(),
        studentAPI.getAll({ limit: 8, sort: '-createdAt' }),
      ]);
      setStats(statsRes.data.data);
      setRecentStudents(studentsRes.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '80vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading dashboard...</div>
      </div>
    </div>
  );

  // Stats calculations
  const totalRooms     = stats?.rooms?.total        ?? 0;
  const availableRooms = stats?.rooms?.available    ?? 0;
  const occupiedRooms  = stats?.rooms?.occupied     ?? 0;
  const fullRooms      = stats?.rooms?.full         ?? 0;
  const maintenance    = stats?.rooms?.maintenance  ?? 0;
  const reserved       = stats?.rooms?.reserved     ?? 0;
  const totalStudents  = stats?.students?.total     ?? 0;
  const feesPending    = stats?.students?.feesPending ?? 0;
  const allocated      = stats?.students?.allocated ?? 0;
  const occupancyRate  = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const totalBeds      = totalRooms * 3;
  const usedBeds       = allocated;
  const freeBeds       = totalBeds - usedBeds;

  const roomStatusData = [
    { name: 'Available',   value: availableRooms, color: '#34d399' },
    { name: 'Occupied',    value: occupiedRooms - fullRooms, color: '#fbbf24' },
    { name: 'Full',        value: fullRooms,      color: '#fb7185' },
    { name: 'Maintenance', value: maintenance,    color: '#38bdf8' },
    { name: 'Reserved',    value: reserved,       color: '#a78bfa' },
  ].filter(d => d.value > 0);

  const roomTypeData = stats?.rooms?.byType?.map(t => ({
    name: t._id, rooms: t.count, capacity: t.totalCapacity,
  })) || [];

  const blockData = stats?.rooms?.byBlock?.map(b => ({
    name: `Block ${b._id}`, rooms: b.count,
    occupied: 0,
  })) || [];

  // Beds overview data
  const bedsData = [
    { name: 'Used Beds',  value: usedBeds,  color: '#7c6bff' },
    { name: 'Free Beds',  value: freeBeds,  color: '#34d399' },
  ];

  return (
    <div style={{ width: '100%' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            Hostel Overview
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            Real-time stats · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* ── ROW 1: Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 14,
        marginBottom: 24,
        width: '100%',
      }}>
        <StatCard icon="⬡" label="Total Rooms"  value={totalRooms}     color="var(--accent-glow)"  valueColor="var(--accent-2)"  subtitle={`${totalBeds} beds total`} />
        <StatCard icon="✦" label="Available"    value={availableRooms} color="var(--emerald-glow)" valueColor="var(--emerald)"   subtitle="Empty rooms"     onClick={() => navigate('/rooms')} />
        <StatCard icon="◉" label="Students"     value={totalStudents}  color="var(--teal-glow)"    valueColor="var(--teal)"      subtitle={`${allocated} allocated`} onClick={() => navigate('/students')} />
        <StatCard icon="⚠" label="Fees Pending" value={feesPending}    color="var(--rose-glow)"    valueColor="var(--rose)"      subtitle="Need payment"    onClick={() => navigate('/students')} />
        <StatCard icon="🔧" label="Maintenance" value={maintenance}    color="var(--amber-glow)"   valueColor="var(--amber)"     subtitle="Under repair" />
        <StatCard icon="◈" label="Occupancy"    value={`${occupancyRate}%`} color="var(--sky-glow)" valueColor="var(--sky)"    subtitle={`${occupiedRooms} rooms used`} />
      </div>

      {/* ── ROW 2: Beds Summary Banner ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        marginBottom: 24,
        width: '100%',
      }}>
        {[
          { label: 'Total Beds',    value: totalBeds,   icon: '🛏', color: 'var(--accent-2)',  bg: 'rgba(124,107,255,0.08)', border: 'rgba(124,107,255,0.2)' },
          { label: 'Occupied Beds', value: usedBeds,    icon: '👥', color: 'var(--rose)',      bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.2)' },
          { label: 'Free Beds',     value: freeBeds,    icon: '✅', color: 'var(--emerald)',   bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
          { label: 'Full Rooms',    value: fullRooms,   icon: '🔴', color: 'var(--amber)',     bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)'  },
        ].map((item, i) => (
          <div key={i} style={{
            background: item.bg,
            border: `1px solid ${item.border}`,
            borderRadius: 'var(--r-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: item.color }}>
                {item.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 3: Charts ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 20,
        marginBottom: 24,
        width: '100%',
      }}>

        {/* Room Status Pie */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Room Status</div>
            <div className="section-subtitle">current distribution</div>
          </div>
          {roomStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roomStatusData} cx="50%" cy="45%" innerRadius={55} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {roomStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
                <Legend
                  formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{v}</span>}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-text">No data available</div>
            </div>
          )}
        </div>

        {/* Beds Pie */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Bed Occupancy</div>
            <div className="section-subtitle">used vs free beds</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={bedsData} cx="50%" cy="45%" innerRadius={55} outerRadius={80}
                dataKey="value" paddingAngle={3}>
                {bedsData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
              <Legend
                formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{v}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rooms by Type Bar */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Rooms by Type</div>
            <div className="section-subtitle">count &amp; capacity</div>
          </div>
          {roomTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roomTypeData} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="rooms"    fill="url(#barGrad1)" radius={[4,4,0,0]} name="Rooms" />
                <Bar dataKey="capacity" fill="url(#barGrad2)" radius={[4,4,0,0]} name="Capacity" />
                <defs>
                  <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7c6bff" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7c6bff" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2dd4bf" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-text">No type data</div>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 4: Block Distribution + Recent Students ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: 20,
        width: '100%',
      }}>

        {/* Rooms by Block */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Rooms by Building</div>
            <div className="section-subtitle">5 buildings · {totalRooms} total rooms</div>
          </div>
          {blockData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {blockData.map((b, i) => (
                <div key={b.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: COLORS[i % COLORS.length] }}>
                      {b.rooms} rooms
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((b.rooms / (totalRooms || 1)) * 100 * 5, 100)}%`,
                      background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i+1) % COLORS.length]})`,
                      borderRadius: 100,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div style={{
                marginTop: 8,
                padding: '12px 14px',
                background: 'var(--glass-white)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--r-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-2)', fontFamily: 'var(--font-mono)' }}>{totalRooms}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Rooms</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{availableRooms}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Available</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px' }}>
              <div className="empty-state-text">No block data</div>
            </div>
          )}
        </div>

        {/* Recent Students */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title">Recent Students</div>
              <div className="section-subtitle">{totalStudents} total · {allocated} allocated</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/students')}>
              View All →
            </button>
          </div>

          {recentStudents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentStudents.map(s => (
                <div key={s._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'var(--glass-white)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    transition: 'all var(--t)',
                  }}
                  onClick={() => navigate(`/students/${s._id}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(124,107,255,0.35)';
                    e.currentTarget.style.background  = 'var(--glass-white-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                    e.currentTarget.style.background  = 'var(--glass-white)';
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS[s.name.charCodeAt(0) % COLORS.length]}, var(--teal))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: 'white', flexShrink: 0,
                    boxShadow: '0 0 12px var(--accent-glow)',
                  }}>
                    {s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {s.studentId} · {s.course}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge ${s.room ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {s.room ? '✓ Allocated' : '○ Pending'}
                    </span>
                    <span className={`badge ${s.feesPaid ? 'badge-teal' : 'badge-red'}`} style={{ fontSize: 10 }}>
                      {s.feesPaid ? '₹ Paid' : '₹ Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">◉</div>
              <div className="empty-state-title">No students yet</div>
              <div className="empty-state-text">Register students to see them here</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/students')}>
                + Add Student
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
