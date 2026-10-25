import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Trash2,
  Edit2,
  Building,
  Layers,
  LayoutGrid,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
} from 'lucide-react';

interface Seat {
  id: number;
  floor_id: number;
  label: string;
  row: number;
  col: number;
  capacity: number;
}

interface Floor {
  id: number;
  name: string;
}

interface Restaurant {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  image?: string;
  floors?: number;
  tables?: number;
}

export const AdminPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  // Selected restaurant details
  const [floors, setFloors] = useState<Floor[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals / forms state
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    category: 'Non-veg',
    latitude: '13.0827',
    longitude: '80.2707',
    image: '',
  });

  const [newFloorName, setNewFloorName] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // Add Seat Form
  const [seatForm, setSeatForm] = useState({
    label: '',
    capacity: 4,
    row: 1,
    col: 1,
  });

  // Guard admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent('/admin')}`);
      } else if (!user.is_admin) {
        navigate('/');
      } else {
        loadRestaurants();
      }
    }
  }, [user, authLoading]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/restaurants');
      if (res.ok) {
        const data: Restaurant[] = await res.json();
        setRestaurants(data);
        if (data.length > 0 && !selectedRestaurantId) {
          setSelectedRestaurantId(data[0].id);
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load restaurant list.' });
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantDetails = async (restId: number) => {
    try {
      const res = await fetch(`/api/restaurants/${restId}`);
      if (res.ok) {
        const data = await res.json();
        setFloors(data.floors);
        setSeats(data.seats);
        if (data.floors.length > 0) {
          setActiveFloorId(data.floors[0].id);
        } else {
          setActiveFloorId(null);
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load restaurant layout.' });
    }
  };

  useEffect(() => {
    if (selectedRestaurantId) {
      loadRestaurantDetails(selectedRestaurantId);
      setSelectedSeat(null);
    }
  }, [selectedRestaurantId]);

  // Restaurant CRUD Handlers
  const handleOpenCreateModal = () => {
    setEditingRestaurant(null);
    setRestaurantForm({
      name: '',
      category: 'Non-veg',
      latitude: '13.0827',
      longitude: '80.2707',
      image: '',
    });
    setShowAddRestaurantModal(true);
  };

  const handleOpenEditModal = (r: Restaurant) => {
    setEditingRestaurant(r);
    setRestaurantForm({
      name: r.name,
      category: r.category,
      latitude: r.latitude.toString(),
      longitude: r.longitude.toString(),
      image: r.image || '',
    });
    setShowAddRestaurantModal(true);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantForm.name.trim()) {
      setMessage({ type: 'error', text: 'Restaurant name is required.' });
      return;
    }

    const payload = {
      name: restaurantForm.name.trim(),
      category: restaurantForm.category.trim(),
      latitude: parseFloat(restaurantForm.latitude) || 13.0827,
      longitude: parseFloat(restaurantForm.longitude) || 80.2707,
      image: restaurantForm.image.trim(),
    };

    try {
      let res;
      if (editingRestaurant) {
        res = await fetch(`/api/admin/restaurants/${editingRestaurant.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save restaurant.');
      }

      setShowAddRestaurantModal(false);
      setMessage({
        type: 'success',
        text: editingRestaurant ? 'Restaurant updated successfully!' : 'New restaurant added successfully!',
      });
      await loadRestaurants();
      if (!editingRestaurant && data.restaurant?.id) {
        setSelectedRestaurantId(data.restaurant.id);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
    }
  };

  const handleDeleteRestaurant = async (r: Restaurant) => {
    const ok = window.confirm(
      `Are you sure you want to delete "${r.name}"? This will delete all associated floors, tables, and bookings permanently.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/restaurants/${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete restaurant.');

      setMessage({ type: 'success', text: `Restaurant "${r.name}" deleted.` });
      const updatedList = restaurants.filter((x) => x.id !== r.id);
      setRestaurants(updatedList);
      if (selectedRestaurantId === r.id) {
        setSelectedRestaurantId(updatedList[0]?.id || null);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Could not delete restaurant.' });
    }
  };

  // Floor Handlers
  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId || !newFloorName.trim()) return;

    try {
      const res = await fetch(`/api/admin/restaurants/${selectedRestaurantId}/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFloorName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add floor.');

      setNewFloorName('');
      setMessage({ type: 'success', text: `Floor "${data.floor.name}" added.` });
      await loadRestaurantDetails(selectedRestaurantId);
      setActiveFloorId(data.floor.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Seat CRUD Handlers
  const handleAddSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFloorId || !seatForm.label.trim()) return;

    try {
      const res = await fetch(`/api/admin/floors/${activeFloorId}/seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: seatForm.label.trim(),
          capacity: Number(seatForm.capacity),
          row: Number(seatForm.row),
          col: Number(seatForm.col),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add seat.');

      setMessage({ type: 'success', text: `Table "${data.seat.label}" added.` });
      if (selectedRestaurantId) await loadRestaurantDetails(selectedRestaurantId);
      setSeatForm((prev) => ({
        ...prev,
        label: `T${seats.length + 2}`,
        col: prev.col + 1,
      }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) return;

    try {
      const res = await fetch(`/api/admin/seats/${selectedSeat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: selectedSeat.label,
          capacity: selectedSeat.capacity,
          row: selectedSeat.row,
          col: selectedSeat.col,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update seat.');

      setMessage({ type: 'success', text: `Table "${selectedSeat.label}" updated.` });
      if (selectedRestaurantId) await loadRestaurantDetails(selectedRestaurantId);
      setSelectedSeat(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteSeat = async (seatId: number) => {
    try {
      const res = await fetch(`/api/admin/seats/${seatId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Cannot delete seat (may have bookings).');
      }

      setMessage({ type: 'success', text: 'Table deleted.' });
      if (selectedRestaurantId) await loadRestaurantDetails(selectedRestaurantId);
      setSelectedSeat(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const activeFloorSeats = seats.filter((s) => s.floor_id === activeFloorId);
  const maxCol = activeFloorSeats.length > 0 ? Math.max(...activeFloorSeats.map((s) => s.col)) : 4;
  const gridCols = Math.max(maxCol + 1, 5);

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);

  return (
    <div className="canvas">
      {/* Header */}
      <div className="title-row" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Admin Management</h1>
          <p className="subline">Manage restaurants, floors, and table layouts in real-time</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenCreateModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> Add Restaurant
        </button>
      </div>

      {/* Status Alert Banner */}
      {message && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-control)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: message.type === 'error' ? '#ffedea' : '#e6f7ec',
            color: message.type === 'error' ? '#831c1e' : '#137333',
            border: `1px solid ${message.type === 'error' ? '#f0c2bd' : '#a8dab5'}`,
            fontSize: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2-Column Admin Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Restaurant List Card */}
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building size={18} color="var(--accent)" /> Restaurants ({restaurants.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                Loading restaurants…
              </div>
            ) : restaurants.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                No restaurants yet. Click "Add Restaurant" to create one.
              </div>
            ) : (
              restaurants.map((r) => {
                const isSelected = r.id === selectedRestaurantId;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRestaurantId(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                    background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: isSelected ? 'var(--accent-ink)' : 'var(--text)' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 2 }}>
                      {r.category} • {r.floors || 1} floors • {r.tables || 0} tables
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(r)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        padding: 4,
                      }}
                      title="Edit restaurant details"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRestaurant(r)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#c5221f',
                        padding: 4,
                      }}
                      title="Delete restaurant"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} color={isSelected ? 'var(--accent)' : 'var(--muted)'} />
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Column: Floor & Seat Map Editor */}
        {selectedRestaurant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Floor Manager Card */}
            <div className="panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} color="var(--accent)" /> Floors for {selectedRestaurant.name}
                </h2>
              </div>

              {/* Floor Tabs */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {floors.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveFloorId(f.id);
                      setSelectedSeat(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid',
                      borderColor: activeFloorId === f.id ? 'var(--accent)' : 'var(--border)',
                      background: activeFloorId === f.id ? 'var(--accent-soft)' : 'var(--surface)',
                      color: activeFloorId === f.id ? 'var(--accent-ink)' : 'var(--text)',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {f.name} Floor
                  </button>
                ))}
              </div>

              {/* Add Floor Form */}
              <form onSubmit={handleAddFloor} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="New floor name (e.g. Rooftop, First)"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  style={{
                    flex: 1,
                    height: 'var(--control-height)',
                    padding: '0 12px',
                    border: '1px solid var(--control)',
                    borderRadius: 'var(--radius-control)',
                    font: 'inherit',
                    fontSize: '14px',
                  }}
                  required
                />
                <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  Add Floor
                </button>
              </form>
            </div>

            {/* Visual Table Editor */}
            {activeFloorId && (
              <div className="panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LayoutGrid size={18} color="var(--accent)" /> Table Layout
                  </h2>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Click a table to edit or delete it
                  </span>
                </div>

                {/* 2D Grid Preview */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    gap: 8,
                    background: 'var(--ground)',
                    padding: 16,
                    borderRadius: 'var(--radius-card)',
                    marginBottom: '20px',
                    minHeight: '160px',
                  }}
                >
                  {activeFloorSeats.map((seat) => {
                    const isSelected = selectedSeat?.id === seat.id;
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => setSelectedSeat(seat)}
                        style={{
                          gridRow: seat.row,
                          gridColumn: seat.col,
                          height: 72,
                          borderRadius: 'var(--radius-control)',
                          border: isSelected ? '2px solid var(--accent)' : '1px dashed var(--control)',
                          background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                          color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{seat.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{seat.capacity} seats</span>
                      </button>
                    );
                  })}
                </div>

                {/* Edit Selected Seat Form */}
                {selectedSeat ? (
                  <form
                    onSubmit={handleUpdateSeat}
                    style={{
                      padding: 16,
                      background: 'var(--raised)',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--border)',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Edit Table {selectedSeat.label}</span>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => handleDeleteSeat(selectedSeat.id)}
                        style={{ height: 28, padding: '0 8px', fontSize: 12, borderColor: '#f0c2bd', color: '#831c1e' }}
                      >
                        <Trash2 size={12} style={{ marginRight: 4 }} /> Delete Table
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Label</label>
                        <input
                          type="text"
                          value={selectedSeat.label}
                          onChange={(e) => setSelectedSeat({ ...selectedSeat, label: e.target.value })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Seats</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={selectedSeat.capacity}
                          onChange={(e) => setSelectedSeat({ ...selectedSeat, capacity: Number(e.target.value) })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Row</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={selectedSeat.row}
                          onChange={(e) => setSelectedSeat({ ...selectedSeat, row: Number(e.target.value) })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Column</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={selectedSeat.col}
                          onChange={(e) => setSelectedSeat({ ...selectedSeat, col: Number(e.target.value) })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn-primary" style={{ height: 36, fontSize: 13 }}>
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setSelectedSeat(null)}
                        style={{ height: 36, fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Add New Seat Form */
                  <form onSubmit={handleAddSeat} style={{ borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add a Table to this Floor</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Label</label>
                        <input
                          type="text"
                          placeholder="e.g. T4"
                          value={seatForm.label}
                          onChange={(e) => setSeatForm({ ...seatForm, label: e.target.value })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Seats</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={seatForm.capacity}
                          onChange={(e) => setSeatForm({ ...seatForm, capacity: Number(e.target.value) })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Row</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={seatForm.row}
                          onChange={(e) => setSeatForm({ ...seatForm, row: Number(e.target.value) })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Column</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={seatForm.col}
                          onChange={(e) => setSeatForm({ ...seatForm, col: Number(e.target.value) })}
                          style={{ width: '100%', height: 36, padding: '0 8px', borderRadius: 8, border: '1px solid var(--control)' }}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: 36, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={14} /> Add Table
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Restaurant Modal */}
      {showAddRestaurantModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 2000,
          }}
          onClick={() => setShowAddRestaurantModal(false)}
        >
          <div
            className="panel"
            style={{ width: '100%', maxWidth: '480px', padding: 28, boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddRestaurantModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="control">
                <label className="control-label">Restaurant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Copper Chimney"
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="control">
                <label className="control-label">Cuisine / Category</label>
                <input
                  type="text"
                  placeholder="e.g. Non-veg, North Indian, Veg"
                  value={restaurantForm.category}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, category: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="control">
                  <label className="control-label">Latitude</label>
                  <input
                    type="text"
                    value={restaurantForm.latitude}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, latitude: e.target.value })}
                    required
                  />
                </div>
                <div className="control">
                  <label className="control-label">Longitude</label>
                  <input
                    type="text"
                    value={restaurantForm.longitude}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, longitude: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="control">
                <label className="control-label">Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. /assets/hero.jpg"
                  value={restaurantForm.image}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, image: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingRestaurant ? 'Update Restaurant' : 'Create Restaurant'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowAddRestaurantModal(false)}
                  style={{ height: 'var(--control-height)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
