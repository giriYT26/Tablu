import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Timer,
  CalendarDays,
  Users,
  Armchair,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
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
}

interface SeatStatusPayload {
  floors?: {
    id: number;
    name: string;
    seats: { id: number; status: 'free' | 'booked' | 'held' }[];
  }[];
}

const SLOTS = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'];

const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildDays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return {
      iso: toLocalISO(d),
      dow: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
      day: d.getDate(),
      mon: d.toLocaleDateString(undefined, { month: 'short' }),
    };
  });

const slotLabel = (slot: string) => {
  const [h, m] = slot.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${`${m}`.padStart(2, '0')} ${suffix}`;
};

const friendlyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking filters
  const days = useMemo(buildDays, []);
  const [date, setDate] = useState(days[0].iso);
  const [slot, setSlot] = useState('19:00');

  // Seats status
  const [seatStatuses, setSeatStatuses] = useState<SeatStatusResponse>({ booked: [], held: [] });
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Hold timer
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [timerText, setTimerText] = useState<string>('');
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        const data: SeatStatusPayload = await res.json();
        // The API groups seats by floor and reports a status per table.
        const booked: number[] = [];
        const held: number[] = [];
        (data.floors ?? []).forEach((floor) => {
          floor.seats.forEach((seat) => {
            if (seat.status === 'booked') booked.push(seat.id);
            if (seat.status === 'held') held.push(seat.id);
          });
        });
        setSeatStatuses({ booked, held });
      }
    } catch {
      // ignore network hiccups — the map simply keeps its last state
    }
  };

  const stopHoldTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setHoldExpiresAt(null);
    setTimerText('');
  };

  useEffect(() => {
    loadSeatStatuses();
    setSelectedSeatIds([]);
    stopHoldTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date, slot]);

  // Hold countdown handler
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
        setTimerText(`${m}:${s < 10 ? '0' + s : s}`);
      }
    };

    tick();
    timerIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdExpiresAt]);

  // Sync hold with server
  const syncHoldWithServer = async (seatIds: number[]) => {
    if (!user) return; // Unauthenticated users don't hold on the server until login
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
          text:
            errData.error === 'seat held by someone else'
              ? 'Another diner is currently holding those tables. The map has refreshed.'
              : 'Those tables were just booked by someone else. The map has refreshed.',
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
      <div className="canvas booking-page">
        <div className="skeleton-bar" style={{ width: 120, height: 14 }} />
        <div className="skeleton-bar" style={{ width: '42%', height: 46, marginTop: 22 }} />
        <div className="panel" style={{ height: 260, marginTop: 32 }} />
      </div>
    );
  }

  if (error || !restaurantData) {
    return (
      <div className="canvas booking-page">
        <div className="empty-state">
          <span className="empty-icon">
            <ShieldAlert size={24} />
          </span>
          <h3>We couldn’t open this restaurant</h3>
          <p>{error || 'Restaurant not found.'}</p>
          <Link to="/" className="btn-primary">
            <ChevronLeft size={15} /> Back to restaurants
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
    <div className="canvas booking-page">
      <Link to="/" className="back-link">
        <ChevronLeft size={15} /> All restaurants
      </Link>

      {/* Header */}
      <header className="venue-header">
        <div>
          <p className="eyebrow">{restaurant.category} · Chennai</p>
          <h1>{restaurant.name}</h1>
          <p className="venue-meta">
            <Armchair size={14} /> {seats.length} tables
            <span className="dot">•</span>
            <UtensilsCrossed size={14} /> {floors.length} {floors.length === 1 ? 'floor' : 'floors'}
            <span className="dot">•</span>
            <Clock size={14} /> Lunch & dinner service
          </p>
        </div>
        <span className="live-badge">Live availability</span>
      </header>

      {/* Date + time */}
      <section className="booking-steps" aria-label="Choose date and time">
        <div className="step">
          <span className="step-n">1</span>
          <div className="step-body">
            <span className="step-label">Choose a date</span>
            <div className="day-strip">
              {days.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  className={`day-chip${date === d.iso ? ' is-active' : ''}`}
                  onClick={() => setDate(d.iso)}
                  aria-pressed={date === d.iso}
                >
                  <span className="dow">{d.dow}</span>
                  <span className="dnum">{d.day}</span>
                  <span className="dmon">{d.mon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="step">
          <span className="step-n">2</span>
          <div className="step-body">
            <span className="step-label">Choose a time</span>
            <div className="slot-strip">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`slot-chip${slot === s ? ' is-active' : ''}`}
                  onClick={() => setSlot(s)}
                  aria-pressed={slot === s}
                >
                  {slotLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <div className={`notice ${notice.type === 'error' ? 'is-error' : 'is-success'}`} style={{ marginBottom: 20 }}>
          {notice.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="booking-layout">
        {/* Floor plan */}
        <section className="panel seat-panel" aria-label="Table availability">
          <div className="panel-head">
            <div className="legend">
              <span className="legend-item">
                <span className="swatch seat free" /> Available
              </span>
              <span className="legend-item">
                <span className="swatch seat selected" /> Selected
              </span>
              <span className="legend-item">
                <span className="swatch seat booked" /> Booked
              </span>
              <span className="legend-item">
                <span className="swatch seat held" /> On hold
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {timerText && (
                <span className="hold-timer">
                  <Timer size={12} /> {timerText}
                </span>
              )}
              <span className="count">
                {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'table' : 'tables'} selected
              </span>
            </div>
          </div>

          <div className="floor-tabs" role="tablist" aria-label="Floors">
            {floors.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                className="floor-tab"
                aria-selected={activeFloorId === f.id}
                onClick={() => {
                  setActiveFloorId(f.id);
                  setNotice(null);
                }}
              >
                {f.name} floor
              </button>
            ))}
          </div>

          {floorSeats.length === 0 ? (
            <div className="seat-grid-empty">
              <strong>Nothing on this floor yet</strong>
              No tables have been set up for {currentFloor?.name || 'this floor'}.
            </div>
          ) : (
            <div
              className="seat-grid"
              style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
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
                    style={{ gridRow: seat.row, gridColumn: seat.col }}
                    disabled={isDisabled}
                    onClick={() => handleSeatClick(seat)}
                    aria-pressed={isSelected}
                    title={`Table ${seat.label} · ${seat.capacity} seats · ${statusClass}`}
                  >
                    <span className="seat-label">{seat.label}</span>
                    <span className="seat-cap">{seat.capacity} seats</span>
                    <span className="seat-pips" aria-hidden="true">
                      {Array.from({ length: Math.min(seat.capacity, 6) }).map((_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Summary */}
        <aside className="summary" aria-label="Reservation summary">
          <div className="summary-head">
            <p className="eyebrow">Step 3</p>
            <h2>Your reservation</h2>
            <p>
              {restaurant.name} · {currentFloor?.name || 'Ground'} floor
            </p>
          </div>

          <div className="summary-body">
            <div className="summary-row">
              <span>Date</span>
              <strong>{friendlyDate(date)}</strong>
            </div>
            <div className="summary-row">
              <span>Time</span>
              <strong>{slotLabel(slot)}</strong>
            </div>
            <div className="summary-row">
              <span>Tables</span>
              {selectedSeats.length ? (
                <span className="summary-tables">
                  {selectedSeats.map((s) => (
                    <span className="table-pill" key={s.id}>
                      {s.label}
                    </span>
                  ))}
                </span>
              ) : (
                <strong style={{ color: 'var(--muted-2)', fontWeight: 600 }}>—</strong>
              )}
            </div>

            {selectedSeats.length ? (
              <>
                <div className="summary-total">
                  <span>Party size</span>
                  <strong>
                    {totalCapacity} <small>{totalCapacity === 1 ? 'guest' : 'guests'}</small>
                  </strong>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={bookingInProgress}
                  onClick={handleBook}
                >
                  {bookingInProgress ? 'Reserving…' : user ? 'Confirm reservation' : 'Sign in to reserve'}
                  {!bookingInProgress && <Sparkles size={15} />}
                </button>

                <p className="summary-note">
                  Your table is held for a few minutes while you finish. Cancel free from My bookings.
                </p>
              </>
            ) : (
              <div className="summary-empty">
                <CalendarDays size={22} />
                <div>
                  Pick a table on the floor plan to see your party size and confirm the booking.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <p className="summary-note" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 22 }}>
        <Users size={13} /> Tables are sized for 2–6 guests. Larger group? Combine two adjacent tables.
      </p>
    </div>
  );
};
