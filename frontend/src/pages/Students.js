import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../utils/api';
import StudentFormModal from '../components/StudentFormModal';
import { useToast } from '../components/Toast';

const STATUS_BADGE = { Active: 'badge-green', Inactive: 'badge-gray', Graduated: 'badge-blue', Suspended: 'badge-red' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', gender: '', year: '' });
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getAll({ page, limit: 12, search, ...filters });
      setStudents(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch { toast('Failed to load students', 'error'); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400); return () => clearTimeout(t); }, [searchInput]);

  const handleSave = () => { toast(editStudent ? 'Student updated' : 'Student registered', 'success'); setShowModal(false); setEditStudent(null); fetchStudents(); };
  const handleDelete = async id => {
    try { await studentAPI.delete(id); toast('Student deleted', 'success'); setDeleteConfirm(null); fetchStudents(); }
    catch (err) { toast(err.response?.data?.message || 'Delete failed', 'error'); }
  };

  const glassInput = { background: 'var(--glass-white)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13, padding: '8px 14px', outline: 'none', backdropFilter: 'blur(8px)' };

  return (
    <div>
      <div className="section-header mb-4">
        <div>
          <div className="section-title">◉ Student Records</div>
          <div className="section-subtitle">{total} students registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditStudent(null); setShowModal(true); }}>
          + Register Student
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">⌕</span>
          <input className="form-input" placeholder="Search name, ID, email, course..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <select style={glassInput} value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
          <option value="">All Status</option>
          <option>Active</option><option>Inactive</option><option>Graduated</option><option>Suspended</option>
        </select>
        <select style={glassInput} value={filters.gender} onChange={e => { setFilters(f => ({ ...f, gender: e.target.value })); setPage(1); }}>
          <option value="">All Gender</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
        <select style={glassInput} value={filters.year} onChange={e => { setFilters(f => ({ ...f, year: e.target.value })); setPage(1); }}>
          <option value="">All Years</option>
          {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◉</div>
            <div className="empty-state-title">No students found</div>
            <div className="empty-state-text">Try adjusting filters or register a new student</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--r-xl)' }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>ID</th><th>Course</th>
                  <th>Year</th><th>Room</th><th>Status</th>
                  <th>Details</th><th>Fees</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/students/${s._id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), var(--teal))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                          boxShadow: '0 0 10px var(--accent-glow)'
                        }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="primary">{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-2)', fontSize: 12 }}>{s.studentId}</td>
                    <td>{s.course}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12 }}>Y{s.year}</td>
                    <td>
                      {s.room
                        ? <span className="badge badge-teal">{s.room.roomNumber} · {s.room.block}</span>
                        : <span className="badge badge-gray">—</span>
                      }
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                    <td><span className={`badge ${s.detailsApprovalStatus === 'Approved' ? 'badge-green' : 'badge-yellow'}`}>{s.detailsApprovalStatus || 'Pending'}</span></td>
                    <td><span className={`badge ${s.feeApprovalStatus === 'Approved' ? 'badge-green' : s.feeApprovalStatus === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>{s.feeApprovalStatus || (s.feesPaid ? 'Approved' : 'Pending')}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setEditStudent(s); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setDeleteConfirm(s); }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">Showing {((page-1)*12)+1}–{Math.min(page*12,total)} of {total}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>←</button>
            {Array.from({ length: Math.min(totalPages,5) }, (_,i) => i+1).map(p => (
              <button key={p} className={`page-btn ${page===p?'active':''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>→</button>
          </div>
        </div>
      )}

      {showModal && (
        <StudentFormModal student={editStudent} onClose={() => { setShowModal(false); setEditStudent(null); }} onSave={handleSave} />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Student</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>
                Delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.name}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
