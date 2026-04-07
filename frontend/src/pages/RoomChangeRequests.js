import React, { useEffect, useState } from 'react';
import { roomChangeRequestAPI } from '../utils/api';
import { useToast } from '../components/Toast';

export default function RoomChangeRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await roomChangeRequestAPI.getAll({ status });
      setRequests(response.data.data);
    } catch {
      toast('Failed to load room change requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [status]);

  const handleReview = async (action) => {
    if (!reviewing) return;
    try {
      await roomChangeRequestAPI.review(reviewing._id, { action, adminNotes });
      toast(`Request ${action.toLowerCase()}`, 'success');
      setReviewing(null);
      setAdminNotes('');
      loadRequests();
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to review request', 'error');
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="section-title">Room Change Requests</div>
          <div className="section-subtitle">Review student room move requests with attached proof documents.</div>
        </div>
        <select className="form-select" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⇄</div>
          <div className="empty-state-title">No room change requests</div>
          <div className="empty-state-text">Pending and historical room change requests will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {requests.map((request) => (
            <div key={request._id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--r-lg)', padding: 18, background: 'var(--glass-white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{request.student?.name} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({request.student?.studentId})</span></div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                    {request.currentRoom?.roomNumber || 'No room'} → {request.requestedRoom?.roomNumber}
                  </div>
                </div>
                <span className={`badge ${request.status === 'Pending' ? 'badge-yellow' : request.status === 'Approved' ? 'badge-green' : 'badge-red'}`}>{request.status}</span>
              </div>
              <div style={{ marginTop: 14, color: 'var(--text-secondary)' }}>{request.reason}</div>
              {request.adminNotes && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Admin Notes:</strong> {request.adminNotes}
                </div>
              )}
              {request.status === 'Pending' && (
                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setReviewing(request); setAdminNotes(''); }}>Review Request</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <div className="modal-overlay" onClick={() => setReviewing(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Review Request</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setReviewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                {reviewing.student?.name} wants to move from {reviewing.currentRoom?.roomNumber || 'No room'} to {reviewing.requestedRoom?.roomNumber}.
              </p>
              <div className="form-group">
                <label className="form-label">Admin Notes</label>
                <textarea className="form-textarea" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Decision notes for the student and audit log" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleReview('Rejected')}>Reject</button>
              <button className="btn btn-primary" onClick={() => handleReview('Approved')}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
