import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Clock, MapPin, XCircle, RefreshCw, Utensils, AlertTriangle, X } from 'lucide-react';

interface Booking {
  id: number;
  restaurant_name: string;
  floor_name: string;
  table_label: string;
  capacity: number;
  date: string;
  time_slot: string;
}

export const BookingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom Cancellation Modal State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

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
  }, [user, authLoading]);

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingToCancel.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cancellation failed');
      setBookings((prev) => prev.filter((b) => b.id !== bookingToCancel.id));
      setCancelFeedback(`Reservation at ${bookingToCancel.restaurant_name} (${bookingToCancel.table_label}) has been cancelled.`);
      setBookingToCancel(null);
    } catch {
      alert('Could not cancel booking. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="canvas">
      <div className="title-row">
        <div>
          <h1>My Bookings</h1>
          <p className="subline">
            {loading ? 'Checking your reservations…' : `${bookings.length} ${bookings.length === 1 ? 'reservation' : 'reservations'}`}
          </p>
        </div>

        <button type="button" className="loc-btn" onClick={fetchBookings} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {cancelFeedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-control)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#e6f7ec',
            color: '#137333',
            border: '1px solid #a8dab5',
            fontSize: '14px',
          }}
        >
          <span>{cancelFeedback}</span>
          <button
            type="button"
            onClick={() => setCancelFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="panel" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {loading ? (
          <ul className="list">
            {[1, 2, 3].map((i) => (
              <li key={i}>
                <div className="skeleton">
                  <div className="skeleton-tile" />
                  <div className="skeleton-lines">
                    <div className="skeleton-bar" style={{ width: '50%' }} />
                    <div className="skeleton-bar" style={{ width: '30%', marginTop: 8 }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="error-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchBookings}>
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Utensils size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>No reservations yet</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '14px' }}>
              You don’t have any active seat reservations. Explore restaurants and pick your table!
            </p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <ul className="list">
            {bookings.map((b) => (
              <li key={b.id}>
                <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
                  <div className="grid-tile">
                    <Utensils size={20} />
                  </div>

                  <span className="row-text">
                    <span className="row-name" style={{ fontSize: '16px', fontWeight: 600 }}>
                      {b.restaurant_name}
                    </span>
                    <span className="row-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {b.floor_name}
                      </span>
                      <span>•</span>
                      <span>Table {b.table_label}</span>
                      <span>•</span>
                      <span>
                        {b.capacity} {b.capacity === 1 ? 'seat' : 'seats'}
                      </span>
                    </span>
                  </span>

                  <span className="row-when" style={{ textAlign: 'right' }}>
                    <div className="when-date num" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <CalendarDays size={13} color="var(--muted)" /> {b.date}
                    </div>
                    <div className="when-time num" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                      <Clock size={13} /> {b.time_slot}
                    </div>
                  </span>

                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => {
                      setCancelFeedback(null);
                      setBookingToCancel(b);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      borderColor: '#f0c2bd',
                      color: '#831c1e',
                      background: 'none',
                    }}
                  >
                    <XCircle size={14} />
                    <span>Cancel</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Custom Cancellation Confirmation Modal Popup */}
      {bookingToCancel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 3000,
          }}
          onClick={() => {
            if (!isCanceling) setBookingToCancel(null);
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '30px',
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#ffedea',
                color: '#c5221f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '4px solid #fff0ee',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>
              Cancel Table Reservation?
            </h2>

            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.45 }}>
              Are you sure you want to cancel this booking? The table will immediately be released for other diners to reserve.
            </p>

            {/* Reservation Highlight Box */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-control)',
                background: 'var(--ground)',
                border: '1px solid var(--border)',
                marginBottom: '24px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: 6 }}>
                {bookingToCancel.restaurant_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--muted)', marginBottom: 6 }}>
                <MapPin size={13} /> {bookingToCancel.floor_name} Floor • Table {bookingToCancel.table_label} ({bookingToCancel.capacity} seats)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '13px', color: 'var(--accent-ink)', fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CalendarDays size={13} /> {bookingToCancel.date}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} /> {bookingToCancel.time_slot}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={isCanceling}
                onClick={() => setBookingToCancel(null)}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  borderColor: 'var(--control)',
                }}
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={confirmCancel}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: 'var(--radius-control)',
                  border: 0,
                  background: '#c5221f',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isCanceling ? 'default' : 'pointer',
                  opacity: isCanceling ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(197, 34, 31, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <XCircle size={16} />
                <span>{isCanceling ? 'Canceling…' : 'Yes, Cancel Table'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
