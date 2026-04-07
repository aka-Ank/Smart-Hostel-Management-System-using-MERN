import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildingAPI, roomAPI } from '../utils/api';
import RoomFormModal from '../components/RoomFormModal';
import { useToast } from '../components/Toast';

const STATUS_BADGE = { Available: 'badge-green', Full: 'badge-red', Maintenance: 'badge-yellow', Reserved: 'badge-blue' };

const AMENITY_ICONS = {
  hasAC: { icon: '❄', label: 'AC' },
  hasWifi: { icon: '📶', label: 'WiFi' },
  hasAttachedBathroom: { icon: '🚿', label: 'Bath' },
  hasBalcony: { icon: '🌿', label: 'Balcony' },
  hasTV: { icon: '📺', label: 'TV' },
};

function RoomCard({ room, selected, onToggle, onEdit, onDelete, onClick }) {
  const occ = room.occupants?.length || 0;
  const pct = room.capacity > 0 ? Math.round((occ / room.capacity) * 100) : 0;
  const fillClass = pct >= 100 ? 'occupancy-high' : pct >= 60 ? 'occupancy-mid' : 'occupancy-low';

  return (
    <div className="room-card" onClick={onClick}>
      <div className="room-card-header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
          <input type="checkbox" checked={selected} onClick={(event) => event.stopPropagation()} onChange={(event) => { event.stopPropagation(); onToggle(room._id); }} />
          <div>
            <div className="room-number">{room.roomNumber}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {room.buildingName} · Floor {room.floor}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className={`badge ${STATUS_BADGE[room.status]}`}>{room.status}</span>
          <span className="room-type-badge">{room.type}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>{occ}/{room.capacity} occupied</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>{pct}%</span>
      </div>
      <div className="room-occupancy-bar">
        <div className={`room-occupancy-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--emerald)', fontWeight: 600 }}>
          ₹{room.monthlyRent?.toLocaleString()}/mo
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={(event) => { event.stopPropagation(); onEdit(room); }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={(event) => { event.stopPropagation(); onDelete(room); }}>Del</button>
        </div>
      </div>
      <div className="amenities-list">
        {Object.entries(AMENITY_ICONS).filter(([key]) => room.amenities?.[key]).map(([key, value]) => (
          <span key={key} className="amenity-chip">{value.icon} {value.label}</span>
        ))}
        {(room.features || []).map((feature) => (
          <span key={feature} className="amenity-chip">{feature}</span>
        ))}
      </div>
    </div>
  );
}

export default function Rooms() {
  const toast = useToast();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [perPage, setPerPage] = useState(28);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('Available');
  const [rangeSelector, setRangeSelector] = useState({ buildingName: '', floor: '', from: '', to: '' });
  const [bulkCreateForm, setBulkCreateForm] = useState({
    buildingName: '',
    floor: '',
    fromRoomNumber: '',
    toRoomNumber: '',
    monthlyRent: 3000,
    type: 'Triple',
    capacity: 3,
  });

  const loadBuildings = useCallback(async () => {
    try {
      const response = await buildingAPI.getAll();
      setBuildings(response.data.data);
    } catch {
      toast('Failed to load buildings', 'error');
    }
  }, [toast]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: perPage,
        search,
        status: statusFilter,
        building: buildingFilter,
        floor: floorFilter,
      };
      const response = await roomAPI.getAll(params);
      setRooms(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch {
      toast('Failed to load rooms', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, buildingFilter, floorFilter, toast]);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedCount = selectedRoomIds.length;
  const allVisibleSelected = useMemo(
    () => rooms.length > 0 && rooms.every((room) => selectedRoomIds.includes(room._id)),
    [rooms, selectedRoomIds]
  );

  const toggleSelection = (roomId) => {
    setSelectedRoomIds((current) => (
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]
    ));
  };

  const selectAllVisible = () => setSelectedRoomIds(rooms.map((room) => room._id));
  const clearSelection = () => setSelectedRoomIds([]);

  const handleSeriesSelect = async () => {
    if (!rangeSelector.buildingName || !rangeSelector.floor || !rangeSelector.from || !rangeSelector.to) {
      toast('Choose building, floor, and room range', 'error');
      return;
    }
    try {
      const response = await roomAPI.getAll({
        building: rangeSelector.buildingName,
        floor: rangeSelector.floor,
        limit: 1000,
      });
      const matching = response.data.data
        .filter((room) => room.roomNumberOnFloor >= Number(rangeSelector.from) && room.roomNumberOnFloor <= Number(rangeSelector.to))
        .map((room) => room._id);
      setSelectedRoomIds(matching);
      toast(`Selected ${matching.length} room(s) in series`, 'success');
    } catch {
      toast('Failed to select room series', 'error');
    }
  };

  const handleBulkStatus = async () => {
    if (selectedCount === 0) return toast('Select at least one room', 'error');
    try {
      await roomAPI.bulkUpdate({ roomIds: selectedRoomIds, updates: { status: bulkStatus } });
      toast('Room status updated', 'success');
      clearSelection();
      fetchRooms();
    } catch (error) {
      toast(error.response?.data?.message || 'Bulk update failed', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return toast('Select at least one room', 'error');
    if (!window.confirm(`Delete ${selectedCount} selected room(s)?`)) return;
    try {
      await roomAPI.bulkDelete({ roomIds: selectedRoomIds });
      toast('Selected rooms deleted', 'success');
      clearSelection();
      fetchRooms();
    } catch (error) {
      toast(error.response?.data?.message || 'Bulk delete failed', 'error');
    }
  };

  const handleBulkCreate = async (event) => {
    event.preventDefault();
    try {
      await roomAPI.bulkCreate(bulkCreateForm);
      toast('Room series added', 'success');
      setBulkCreateForm({
        buildingName: '',
        floor: '',
        fromRoomNumber: '',
        toRoomNumber: '',
        monthlyRent: 3000,
        type: 'Triple',
        capacity: 3,
      });
      fetchRooms();
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to add room series', 'error');
    }
  };

  const handleSave = () => {
    toast(editRoom ? 'Room updated' : 'Room added', 'success');
    setShowModal(false);
    setEditRoom(null);
    fetchRooms();
  };

  const handleDelete = async (roomId) => {
    try {
      await roomAPI.delete(roomId);
      toast('Room deleted', 'success');
      setDeleteConfirm(null);
      fetchRooms();
    } catch (error) {
      toast(error.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const selectStyle = {
    background: 'var(--glass-white)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--r-md)',
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '8px 32px 8px 12px',
    outline: 'none',
    appearance: 'none',
  };

  return (
    <div>
      <div className="section-header mb-4">
        <div>
          <div className="section-title">⬡ Room Management</div>
          <div className="section-subtitle">{total} rooms total · advanced search, range selection, and bulk actions</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0, background: viewMode === 'grid' ? 'var(--surface-soft)' : 'transparent' }} onClick={() => setViewMode('grid')}>⊞ Grid</button>
            <button className="btn btn-secondary btn-sm" style={{ borderRadius: 0, background: viewMode === 'table' ? 'var(--surface-soft)' : 'transparent' }} onClick={() => setViewMode('table')}>≡ Table</button>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditRoom(null); setShowModal(true); }}>+ Add Room</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, minmax(120px, 1fr))', gap: 10, alignItems: 'center' }}>
          <input className="form-input" placeholder="Search by building or room number" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <select style={selectStyle} value={buildingFilter} onChange={(event) => { setBuildingFilter(event.target.value); setPage(1); }}>
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building._id} value={building.name}>{building.displayName || building.name}</option>
            ))}
          </select>
          <input style={selectStyle} type="number" min="1" placeholder="Floor" value={floorFilter} onChange={(event) => { setFloorFilter(event.target.value); setPage(1); }} />
          <select style={selectStyle} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option>Available</option>
            <option>Full</option>
            <option>Maintenance</option>
            <option>Reserved</option>
          </select>
          <select style={selectStyle} value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}>
            <option value={14}>14 / page</option>
            <option value={28}>28 / page</option>
            <option value={56}>56 / page</option>
            <option value={200}>200 / page</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Bulk Selection</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <button className="btn btn-secondary btn-sm" onClick={allVisibleSelected ? clearSelection : selectAllVisible}>
              {allVisibleSelected ? 'Deselect Visible' : 'Select All Visible'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={clearSelection}>Clear Selection</button>
            <span className="badge badge-blue">{selectedCount} selected</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 10 }}>
            <select className="form-select" value={rangeSelector.buildingName} onChange={(event) => setRangeSelector((current) => ({ ...current, buildingName: event.target.value }))}>
              <option value="">Building</option>
              {buildings.map((building) => <option key={building._id} value={building.name}>{building.name}</option>)}
            </select>
            <input className="form-input" type="number" min="1" placeholder="Floor" value={rangeSelector.floor} onChange={(event) => setRangeSelector((current) => ({ ...current, floor: event.target.value }))} />
            <input className="form-input" type="number" min="1" placeholder="From" value={rangeSelector.from} onChange={(event) => setRangeSelector((current) => ({ ...current, from: event.target.value }))} />
            <input className="form-input" type="number" min="1" placeholder="To" value={rangeSelector.to} onChange={(event) => setRangeSelector((current) => ({ ...current, to: event.target.value }))} />
            <button className="btn btn-primary btn-sm" onClick={handleSeriesSelect}>Select Range</button>
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Bulk Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center' }}>
            <select className="form-select" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
              <option>Available</option>
              <option>Full</option>
              <option>Maintenance</option>
              <option>Reserved</option>
            </select>
            <button className="btn btn-secondary" onClick={handleBulkStatus}>Update Status</button>
            <button className="btn btn-danger" onClick={handleBulkDelete}>Delete Selected</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>Add Room Series</div>
        <form onSubmit={handleBulkCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 140px 140px 120px auto', gap: 10, alignItems: 'end' }}>
          <select className="form-select" value={bulkCreateForm.buildingName} onChange={(event) => setBulkCreateForm((current) => ({ ...current, buildingName: event.target.value }))}>
            <option value="">Building</option>
            {buildings.map((building) => <option key={building._id} value={building.name}>{building.name}</option>)}
          </select>
          <input className="form-input" type="number" min="1" placeholder="Floor" value={bulkCreateForm.floor} onChange={(event) => setBulkCreateForm((current) => ({ ...current, floor: event.target.value }))} />
          <input className="form-input" type="number" min="1" placeholder="From" value={bulkCreateForm.fromRoomNumber} onChange={(event) => setBulkCreateForm((current) => ({ ...current, fromRoomNumber: event.target.value }))} />
          <input className="form-input" type="number" min="1" placeholder="To" value={bulkCreateForm.toRoomNumber} onChange={(event) => setBulkCreateForm((current) => ({ ...current, toRoomNumber: event.target.value }))} />
          <input className="form-input" type="number" min="0" placeholder="Rent" value={bulkCreateForm.monthlyRent} onChange={(event) => setBulkCreateForm((current) => ({ ...current, monthlyRent: event.target.value }))} />
          <select className="form-select" value={bulkCreateForm.type} onChange={(event) => setBulkCreateForm((current) => ({ ...current, type: event.target.value }))}>
            <option>Single</option>
            <option>Double</option>
            <option>Triple</option>
            <option>Dormitory</option>
          </select>
          <input className="form-input" type="number" min="1" max="20" placeholder="Capacity" value={bulkCreateForm.capacity} onChange={(event) => setBulkCreateForm((current) => ({ ...current, capacity: event.target.value }))} />
          <button type="submit" className="btn btn-primary">Add Rooms</button>
        </form>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
      ) : rooms.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⬡</div>
            <div className="empty-state-title">No rooms found</div>
            <div className="empty-state-text">Try a different search or create a new room series.</div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={room}
              selected={selectedRoomIds.includes(room._id)}
              onToggle={toggleSelection}
              onEdit={(nextRoom) => { setEditRoom(nextRoom); setShowModal(true); }}
              onDelete={setDeleteConfirm}
              onClick={() => navigate(`/rooms/${room._id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--r-xl)' }}>
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" checked={allVisibleSelected} onChange={() => (allVisibleSelected ? clearSelection() : selectAllVisible())} /></th>
                  <th>Room</th>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Occupancy</th>
                  <th>Rent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/rooms/${room._id}`)}>
                    <td onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={selectedRoomIds.includes(room._id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelection(room._id)} />
                    </td>
                    <td className="primary text-mono">{room.roomNumber}</td>
                    <td>{room.buildingName}</td>
                    <td>{room.floor}</td>
                    <td>{room.type}</td>
                    <td>{room.occupants?.length}/{room.capacity}</td>
                    <td style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>₹{room.monthlyRent?.toLocaleString()}</td>
                    <td><span className={`badge ${STATUS_BADGE[room.status]}`}>{room.status}</span></td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditRoom(room); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(room)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Page {page} of {totalPages} · Showing {rooms.length} of {total} rooms
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>←</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>→</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      )}

      {showModal && (
        <RoomFormModal
          room={editRoom}
          onClose={() => { setShowModal(false); setEditRoom(null); }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Room</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>
                Delete room <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{deleteConfirm.roomNumber}</strong>?
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
