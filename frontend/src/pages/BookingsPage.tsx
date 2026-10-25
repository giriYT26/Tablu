import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Clock, MapPin, XCircle, RefreshCw, Utensils } from 'lucide-react';

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
  const [cancelingId, setCancelingId] = useState<number | null>(null);

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

  const handleCancel = async (booking: Booking) => {
    const confirmCancel = window.confirm(
      `Cancel your table at ${booking.restaurant_name} (${booking.floor_name} - ${booking.table_label}) on ${booking.date} at ${booking.time_slot}?`
    );
    if (!confirmCancel) return;

    setCancelingId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cancellation failed');
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch {
      alert('Could not cancel booking. Please try again.');
    } finally {
      setCancelingId(null);
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
                    disabled={cancelingId === b.id}
                    onClick={() => handleCancel(b)}
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
                    <span>{cancelingId === b.id ? 'Canceling…' : 'Cancel'}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
