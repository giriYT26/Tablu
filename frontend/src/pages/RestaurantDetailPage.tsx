import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldAlert, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

interface RestaurantData {
  restaurant: {
    id: number;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    image?: string;
  };
  floors: Floor[];
  seats: Seat[];
}

interface SeatStatusResponse {
  booked: number[];
  held: number[];
  user_holds?: number[];
}

const SLOTS = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'];

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking filters
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState('19:00');

  // Seats status
  const [seatStatuses, setSeatStatuses] = useState<SeatStatusResponse>({ booked: [], held: [] });
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Hold Timer
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [timerText, setTimerText] = useState<string>('');
  const timerIntervalRef = useRef<any>(null);

  // Fetch restaurant basic info & seats
  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (!res.ok) throw new Error('Restaurant not found');
        const data: RestaurantData = await res.json();
        setRestaurantData(data);
        if (data.floors.length > 0) {
          setActiveFloorId(data.floors[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [id]);

  // Fetch seat status whenever date or slot changes
  const loadSeatStatuses = async () => {
    if (!id || !date || !slot) return;
    try {
      const res = await fetch(`/api/restaurants/${id}/seats?date=${date}&slot=${slot}`);
      if (res.ok) {
        const data: SeatStatusResponse = await res.json();
        setSeatStatuses(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSeatStatuses();
    setSelectedSeatIds([]);
    stopHoldTimer();
  }, [id, date, slot]);

  // Hold countdown handler
  const stopHoldTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setHoldExpiresAt(null);
    setTimerText('');
  };

  useEffect(() => {
    if (!holdExpiresAt) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const tick = () => {
      const diff = Math.ceil((holdExpiresAt - Date.now()) / 1000);
      if (diff <= 0) {
        stopHoldTimer();
        setSelectedSeatIds([]);
        loadSeatStatuses();
        setNotice({ type: 'error', text: 'Your seat hold expired. Please select tables again.' });
      } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        setTimerText(`Held for ${m}:${s < 10 ? '0' + s : s}`);
      }
    };

    tick();
    timerIntervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerIntervalRef.current);
  }, [holdExpiresAt]);

  // Sync hold with server
  const syncHoldWithServer = async (seatIds: number[]) => {
    if (!user) return; // Unauthenticated users don't hold on server until login
    try {
      const res = await fetch('/api/holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: seatIds, date, slot }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.expires_at) {
          setHoldExpiresAt(Date.parse(data.expires_at));
        } else {
          stopHoldTimer();
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSeatClick = (seat: Seat) => {
    const isBooked = seatStatuses.booked?.includes(seat.id);
    const isHeld = seatStatuses.held?.includes(seat.id);
    if (isBooked || isHeld) return;

    setNotice(null);
    let next: number[];
    if (selectedSeatIds.includes(seat.id)) {
      next = selectedSeatIds.filter((sId) => sId !== seat.id);
    } else {
      next = [...selectedSeatIds, seat.id];
    }
    setSelectedSeatIds(next);
    syncHoldWithServer(next);
  };

  const handleBook = async () => {
    if (selectedSeatIds.length === 0) return;
    if (!user) {
      // Save pending booking info to redirect back after login
      navigate(`/login?next=${encodeURIComponent(`/restaurants/${id}`)}`);
      return;
    }

    setBookingInProgress(true);
    setNotice(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seats: selectedSeatIds,
          date,
          slot,
        }),
      });

      if (res.status === 401) {
        navigate(`/login?next=${encodeURIComponent(`/restaurants/${id}`)}`);
        return;
      }

      if (res.status === 409) {
        const errData = await res.json().catch(() => ({}));
        await loadSeatStatuses();
        setNotice({
          type: 'error',
          text: errData.error === 'seat held by someone else'
            ? 'Another diner is currently holding those tables.'
            : 'Those tables were just booked by someone else. The map has updated.',
        });
        return;
      }

      if (!res.ok) {
        throw new Error('Could not complete booking.');
      }

      stopHoldTimer();
      navigate('/bookings');
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Booking failed. Try again.' });
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="canvas">
        <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
      </div>
    );
  }

  if (error || !restaurantData) {
    return (
      <div className="canvas">
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <ShieldAlert size={32} color="#c5221f" style={{ margin: '0 auto 12px' }} />
          <h3>Could not load restaurant</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>{error || 'Restaurant not found'}</p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Back to Restaurants
          </Link>
        </div>
      </div>
    );
  }

  const { restaurant, floors, seats } = restaurantData;
  const currentFloor = floors.find((f) => f.id === activeFloorId);
  const floorSeats = seats.filter((s) => s.floor_id === activeFloorId);

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalCapacity = selectedSeats.reduce((acc, s) => acc + s.capacity, 0);

  const maxCol = floorSeats.length > 0 ? Math.max(...floorSeats.map((s) => s.col)) : 5;
  const gridCols = Math.max(maxCol, 4);

  return (
    <div className="canvas">
      {/* Top Breadcrumb Back */}
      <Link to="/" className="back-link">
        <ChevronLeft size={16} /> All restaurants
      </Link>

      {/* Header Info */}
      <div className="title-row" style={{ flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1>{restaurant.name}</h1>
          <p className="subline">
            {restaurant.category} · {floors.length} {floors.length === 1 ? 'floor' : 'floors'} · {seats.length} tables
          </p>
        </div>

        {/* Date and Time Slot Controls */}
        <div className="controls">
          <div className="control">
            <label className="control-label" htmlFor="date-select">
              <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
              Date
            </label>
            <input
              id="date-select"
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="control">
            <label className="control-label" htmlFor="slot-select">
              <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
              Time Slot
            </label>
            <select id="slot-select" value={slot} onChange={(e) => setSlot(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notice Message */}
      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-control)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: notice.type === 'error' ? '#ffedea' : '#e6f7ec',
            color: notice.type === 'error' ? '#831c1e' : '#137333',
            border: `1px solid ${notice.type === 'error' ? '#f0c2bd' : '#a8dab5'}`,
            fontSize: '14px',
          }}
        >
          {notice.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Floor Tabs */}
      {floors.length > 1 && (
        <div className="tabs">
          {floors.map((f) => (
            <button
              key={f.id}
              className="tab"
              aria-selected={activeFloorId === f.id}
              onClick={() => {
                setActiveFloorId(f.id);
                setNotice(null);
              }}
            >
              {f.name} Floor
            </button>
          ))}
        </div>
      )}

      {/* Interactive Seat Grid Panel */}
      <div className="panel" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {/* Panel Header with Legend */}
        <div className="panel-head">
          <div className="legend">
            <div className="legend-item">
              <div className="swatch seat free" style={{ width: 14, height: 14 }} />
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="swatch seat selected" style={{ width: 14, height: 14 }} />
              <span>Selected</span>
            </div>
            <div className="legend-item">
              <div className="swatch seat booked" style={{ width: 14, height: 14 }} />
              <span>Booked</span>
            </div>
            <div className="legend-item">
              <div className="swatch seat held" style={{ width: 14, height: 14 }} />
              <span>Held</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {timerText && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-ink)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Timer size={13} /> {timerText}
              </span>
            )}
            <span className="count" style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 600 }}>
              {selectedSeatIds.length} selected
            </span>
          </div>
        </div>

        {/* Seat Grid */}
        {floorSeats.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            No tables set up for {currentFloor?.name || 'this'} floor yet.
          </div>
        ) : (
          <div
            className="seat-grid"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            }}
          >
            {floorSeats.map((seat) => {
              const isSelected = selectedSeatIds.includes(seat.id);
              const isBooked = seatStatuses.booked?.includes(seat.id);
              const isHeld = seatStatuses.held?.includes(seat.id);

              let statusClass = 'free';
              if (isSelected) statusClass = 'selected';
              else if (isBooked) statusClass = 'booked';
              else if (isHeld) statusClass = 'held';

              const isDisabled = isBooked || isHeld;

              return (
                <button
                  key={seat.id}
                  type="button"
                  className={`seat ${statusClass}`}
                  style={{
                    gridRow: seat.row,
                    gridColumn: seat.col,
                  }}
                  disabled={isDisabled}
                  onClick={() => handleSeatClick(seat)}
                  aria-pressed={isSelected}
                  title={`Table ${seat.label} (${seat.capacity} seats) - ${statusClass}`}
                >
                  <span className="seat-label" style={{ fontWeight: 700 }}>
                    {seat.label}
                  </span>
                  <span className="seat-cap">
                    {seat.capacity} {seat.capacity === 1 ? 'seat' : 'seats'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Booking Action Bar */}
        {selectedSeatIds.length > 0 && (
          <div className="book-bar" style={{ background: '#fafbfc' }}>
            <div className="book-info">
              <div className="book-summary" style={{ fontSize: '15px', fontWeight: 600 }}>
                {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'table' : 'tables'} selected ({totalCapacity} guests)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {date} at {slot}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={bookingInProgress}
              onClick={handleBook}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 24px',
              }}
            >
              {bookingInProgress ? 'Reserving…' : user ? 'Confirm Reservation' : 'Sign in to Reserve'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
