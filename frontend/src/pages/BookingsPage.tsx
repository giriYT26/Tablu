import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  CalendarDays,
  XCircle,
  RefreshCw,
  Utensils,
  AlertTriangle,
  X,
  Armchair,
  MapPin,
  ArrowUpRight,
} from 'lucide-react';

interface Booking {
  id: number;
  restaurant_id?: number;
  restaurant_name: string;
  floor_name: string;
  table_label: string;
  capacity: number;
  date: string;
  time_slot: string;
}

const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const partsOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    day: d,
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    year: y,
  };
};

const slotLabel = (slot: string) => {
  const [h, m] = slot.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${`${m}`.padStart(2, '0')} ${suffix}`;
};

export const BookingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom cancellation modal state
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings');
      if (res.status === 401) {
        navigate(`/login?next=${encodeURIComponent('/bookings')}`);
        return;
      }
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Error loading bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent('/bookings')}`);
      } else {
        fetchBookings();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingToCancel.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cancellation failed');
      setBookings((prev) => prev.filter((b) => b.id !== bookingToCancel.id));
      setCancelFeedback(
        `Reservation at ${bookingToCancel.restaurant_name} (table ${bookingToCancel.table_label}) cancelled. The table is free for other diners.`
      );
      setBookingToCancel(null);
    } catch {
      alert('Could not cancel booking. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  useEffect(() => {
    if (!bookingToCancel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCanceling) setBookingToCancel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bookingToCancel, isCanceling]);

  const today = toLocalISO(new Date());
  const upcoming = bookings.filter((b) => b.date >= today);
  const past = bookings.filter((b) => b.date < today).reverse();
  const visiblePast = showAllPast ? past : past.slice(0, 3);

  const renderTicket = (b: Booking, isPast = false) => {
    const when = partsOf(b.date);
    return (
      <article key={b.id} className={`ticket${isPast ? ' is-past' : ''}`}>
        <div>
          <div className="ticket-top">
            <span className="ticket-tag">
              <MapPin size={10} style={{ marginRight: 3 }} />
              {b.floor_name}
            </span>
            <span className="ticket-id">#TBL-{String(b.id).padStart(4, '0')}</span>
          </div>
          <h3>{b.restaurant_name}</h3>
          <p className="ticket-meta">
            <Armchair size={13} /> Table {b.table_label}
            <span className="dot">•</span>
            <span>
              {b.capacity} {b.capacity === 1 ? 'seat' : 'seats'}
            </span>
          </p>
        </div>

        <div className="ticket-when">
          <span className="ticket-weekday">{isPast ? 'Past visit' : when.weekday}</span>
          <span className="ticket-date">
            {when.day} {when.month}
          </span>
          <span className="ticket-time">
            <Clock size={12} /> {slotLabel(b.time_slot)}
          </span>
        </div>

        <div className="ticket-actions">
          <button
            type="button"
            className="btn-danger-ghost"
            onClick={() => {
              setCancelFeedback(null);
              setBookingToCancel(b);
            }}
          >
            <XCircle size={14} />
            {isPast ? 'Remove' : 'Cancel'}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <p className="eyebrow">Your dining plans</p>
          <h1>My bookings</h1>
          <p className="subline">
            {loading
              ? 'Checking your reservations…'
              : `${upcoming.length} upcoming ${upcoming.length === 1 ? 'reservation' : 'reservations'}${
                  past.length ? ` · ${past.length} past` : ''
                }`}
          </p>
        </div>

        <button type="button" className="loc-btn" onClick={fetchBookings} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {cancelFeedback && (
        <div className="notice is-success" style={{ marginBottom: 20 }}>
          <span>{cancelFeedback}</span>
          <button type="button" onClick={() => setCancelFeedback(null)} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="ticket-list" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div className="ticket" key={i}>
              <div style={{ width: '100%' }}>
                <div className="skeleton-bar" style={{ width: '32%' }} />
                <div className="skeleton-bar big" style={{ width: '52%' }} />
                <div className="skeleton-bar" style={{ width: '28%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state">
          <span className="empty-icon">
            <AlertTriangle size={24} />
          </span>
          <h3>Couldn’t load your bookings</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={fetchBookings}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Utensils size={24} />
          </span>
          <h3>No reservations yet</h3>
          <p>
            Pick a restaurant, choose your exact table and we’ll keep it warm for you. Your reservations will
            show up here.
          </p>
          <Link to="/" className="btn-primary">
            Browse restaurants <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section aria-label="Upcoming reservations">
              <div className="list-heading">
                <span>Upcoming</span>
                <span className="list-heading-count">{upcoming.length}</span>
              </div>
              <div className="ticket-list">{upcoming.map((b) => renderTicket(b))}</div>
            </section>
          )}

          {past.length > 0 && (
            <section aria-label="Past reservations" style={{ marginTop: 36 }}>
              <div className="list-heading">
                <span>Past visits</span>
                <span className="list-heading-count">{past.length}</span>
              </div>
              <div className="ticket-list">{visiblePast.map((b) => renderTicket(b, true))}</div>
              {past.length > visiblePast.length && (
                <div className="past-more">
                  <button type="button" className="btn-ghost" onClick={() => setShowAllPast(true)}>
                    Show all {past.length} past visits
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Cancellation confirmation */}
      {bookingToCancel && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          onClick={() => {
            if (!isCanceling) setBookingToCancel(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <AlertTriangle size={26} />
            </div>

            <h2 id="cancel-title">Cancel this reservation?</h2>
            <p>
              The table will be released immediately and other diners will be able to book it. This can’t be
              undone.
            </p>

            <div className="modal-highlight">
              <strong>{bookingToCancel.restaurant_name}</strong>
              <div className="meta">
                <MapPin size={12} /> {bookingToCancel.floor_name} floor • Table{' '}
                {bookingToCancel.table_label} ({bookingToCancel.capacity} seats)
              </div>
              <div className="when">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CalendarDays size={12} /> {bookingToCancel.date}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {slotLabel(bookingToCancel.time_slot)}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                disabled={isCanceling}
                onClick={() => setBookingToCancel(null)}
              >
                Keep booking
              </button>
              <button type="button" className="btn-danger" disabled={isCanceling} onClick={confirmCancel}>
                <XCircle size={15} />
                {isCanceling ? 'Cancelling…' : 'Cancel table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
