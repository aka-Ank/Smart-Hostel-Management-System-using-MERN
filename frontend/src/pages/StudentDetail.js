import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { studentAPI, roomAPI } from '../utils/api';
import StudentFormModal from '../components/StudentFormModal';
import { useToast } from '../components/Toast';

const STATUS_BADGE = { Active: 'badge-green', Inactive: 'badge-gray', Graduated: 'badge-blue', Suspended: 'badge-red' };

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [feeRemarks, setFeeRemarks] = useState('');

  useEffect(() => {
    (async () => {
      try { const res = await studentAPI.getById(id); setStudent(res.data.data); }
      catch { toast('Student not found', 'error'); navigate('/students'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const fetchRooms = async () => {
    try {
      const res = await roomAPI.getAll({ status: 'Available', limit: 100 });
      const filtered = res.data.data.filter((room) => {
        const type = room.building?.type || 'Unisex';
        if (student?.gender === 'Male') return ['Male', 'Unisex'].includes(type);
        if (student?.gender === 'Female') return ['Female', 'Unisex'].includes(type);
        return type === 'Unisex';
      });
      setAvailableRooms(filtered);
    }
    catch {}
  };

  const refreshStudent = async () => {
    const res = await studentAPI.getById(id);
    setStudent(res.data.data);
  };

  const handleAllocate = async () => {
    if (!selectedRoom) return;
    setAllocating(true);
    try {
      await studentAPI.allocateRoom(id, selectedRoom);
      toast('Room allocated', 'success');
      await refreshStudent();
      setShowAllocate(false); setSelectedRoom('');
    } catch (err) { toast(err.response?.data?.message || 'Allocation failed', 'error'); }
    finally { setAllocating(false); }
  };

  const handleVacate = async () => {
    try {
      await studentAPI.vacateRoom(id);
      toast('Room vacated', 'success');
      await refreshStudent();
    } catch (err) { toast(err.response?.data?.message || 'Failed to vacate', 'error'); }
  };

  const handleApproveDetails = async () => {
    try {
      await studentAPI.approveDetails(id);
      toast('Student details approved', 'success');
      await refreshStudent();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to approve details', 'error');
    }
  };

  const handleReviewFees = async (action) => {
    try {
      await studentAPI.reviewFees(id, { action, remarks: feeRemarks });
      toast(`Fee ${action.toLowerCase()}`, 'success');
      await refreshStudent();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to review fees', 'error');
    }
  };

  const openFeeProof = async (proofId) => {
    try {
      const response = await api.get(`/students/${id}/fees/proofs/${proofId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast('Unable to open proof', 'error');
    }
  };

  if (loading) return <div className="loading-overlay"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!student) return null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/students')}>← Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
        {student.detailsApprovalStatus !== 'Approved' && (
          <button className="btn btn-secondary" onClick={handleApproveDetails}>Approve Details</button>
        )}
        {student.room
          ? <button className="btn btn-danger" onClick={handleVacate}>Vacate Room</button>
          : <button className="btn btn-primary" onClick={() => { setShowAllocate(true); fetchRooms(); }}>Allocate Room</button>
        }
      </div>

      {/* Header Card */}
      <div className="detail-header mb-4">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div className="detail-avatar">{student.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{student.name}</h1>
              <span className={`badge ${STATUS_BADGE[student.status] || 'badge-gray'}`}>{student.status}</span>
              <span className={`badge ${student.feesPaid ? 'badge-green' : 'badge-red'}`}>{student.feesPaid ? 'Fees Paid' : 'Fees Pending'}</span>
              <span className={`badge ${student.detailsApprovalStatus === 'Approved' ? 'badge-green' : 'badge-yellow'}`}>Details {student.detailsApprovalStatus}</span>
              <span className={`badge ${student.feeApprovalStatus === 'Approved' ? 'badge-green' : student.feeApprovalStatus === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>Fee {student.feeApprovalStatus || 'Pending'}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-2)', marginBottom: 14 }}>{student.studentId}</div>
            <div className="info-grid">
              <div className="info-item"><label>Email</label><span>{student.email}</span></div>
              <div className="info-item"><label>Phone</label><span>{student.phone}</span></div>
              <div className="info-item"><label>Gender</label><span>{student.gender}</span></div>
              <div className="info-item"><label>Date of Birth</label><span>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="section-title mb-4">Academic Information</div>
          <div className="info-grid">
            <div className="info-item"><label>Course</label><span>{student.course}</span></div>
            <div className="info-item"><label>Year</label><span>Year {student.year}</span></div>
            <div className="info-item"><label>Admission Date</label><span>{new Date(student.admissionDate).toLocaleDateString()}</span></div>
          </div>
        </div>

        <div className="card">
          <div className="section-title mb-4">Room Allocation</div>
          {student.room ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, var(--accent-glow), var(--teal-glow))', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⬡</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{student.room.roomNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Block {student.room.block} · Floor {student.room.floor}</div>
                </div>
              </div>
              <div className="info-grid">
                <div className="info-item"><label>Type</label><span>{student.room.type}</span></div>
                <div className="info-item"><label>Monthly Rent</label><span style={{ color: 'var(--emerald)' }}>₹{student.room.monthlyRent?.toLocaleString()}</span></div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '28px 20px' }}>
              <div className="empty-state-icon">⬡</div>
              <div className="empty-state-title">No Room Allocated</div>
              <div className="empty-state-text">Assign a room to this student</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title mb-4">Guardian Information</div>
          <div className="info-grid">
            <div className="info-item"><label>Name</label><span>{student.guardianName || '—'}</span></div>
            <div className="info-item"><label>Phone</label><span>{student.guardianPhone || '—'}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="section-title mb-4">Address</div>
          <div className="info-grid">
            <div className="info-item"><label>Street</label><span>{student.address?.street || '—'}</span></div>
            <div className="info-item"><label>City</label><span>{student.address?.city || '—'}</span></div>
            <div className="info-item"><label>State</label><span>{student.address?.state || '—'}</span></div>
            <div className="info-item"><label>Pincode</label><span>{student.address?.pincode || '—'}</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title mb-4">Fee Review</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {(student.feeProofs || []).map((proof) => (
            <button key={proof._id} className="btn btn-secondary btn-sm" onClick={() => openFeeProof(proof._id)}>
              Open {proof.originalName}
            </button>
          ))}
          {(!student.feeProofs || student.feeProofs.length === 0) && (
            <span style={{ color: 'var(--text-muted)' }}>No fee proof uploaded yet.</span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Admin Remarks</label>
          <textarea className="form-textarea" value={feeRemarks} onChange={(e) => setFeeRemarks(e.target.value)} placeholder="Add approval or rejection notes" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-danger" onClick={() => handleReviewFees('Rejected')}>Reject Fee</button>
          <button className="btn btn-primary" onClick={() => handleReviewFees('Approved')}>Approve Fee</button>
        </div>
      </div>

      {showEdit && (
        <StudentFormModal student={student} onClose={() => setShowEdit(false)}
          onSave={updated => { setStudent(updated); setShowEdit(false); toast('Student updated', 'success'); }} />
      )}

      {showAllocate && (
        <div className="modal-overlay" onClick={() => setShowAllocate(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⬡ Allocate Room</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowAllocate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Available Room</label>
                <select className="form-select" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                  <option value="">Choose a room...</option>
                  {availableRooms.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber} — Block {r.block}, Floor {r.floor} ({r.type}) · {r.occupants.length}/{r.capacity} · ₹{r.monthlyRent}/mo
                    </option>
                  ))}
                </select>
                {availableRooms.length === 0 && <p className="form-hint">No available rooms at the moment</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAllocate(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!selectedRoom || allocating} onClick={handleAllocate}>
                {allocating && <span className="loading-spinner" style={{ width: 14, height: 14 }} />}
                Allocate Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
