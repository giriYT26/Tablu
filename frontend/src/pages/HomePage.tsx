import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Navigation as NavigationIcon, ChevronRight, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

interface Restaurant {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  image?: string;
  floors: number;
  tables: number;
  grid_rows?: number;
  grid_cols?: number;
  distance_km?: number;
}

export const HomePage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locNotice, setLocNotice] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchRestaurants = async (searchQuery: string = query, loc = userLocation) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (loc) {
        params.set('lat', loc.lat.toString());
        params.set('lng', loc.lng.toString());
      }
      const res = await fetch(`/api/restaurants?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load restaurants');
      const data = await res.json();
      setRestaurants(data);
    } catch (err: any) {
      setError(err.message || 'Error loading restaurants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants(query, userLocation);
  }, [userLocation]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchRestaurants(val, userLocation);
  };

  const handleLocateMe = () => {
    if (userLocation) {
      // Toggle off
      setUserLocation(null);
      setLocNotice(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocNotice('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setLocNotice(`Location access was denied (${err.message}). Using Chennai downtown as fallback?`);
      },
      { timeout: 8000 }
    );
  };

  const setFallbackChennai = () => {
    setUserLocation({ lat: 13.0827, lng: 80.2707 });
    setLocNotice(null);
  };

  const formatDistance = (km?: number) => {
    if (km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  };

  const renderFloorplan = (rows = 4, cols = 4) => {
    const r = Math.min(Math.max(rows, 2), 6);
    const c = Math.min(Math.max(cols, 2), 6);
    const dot = 3.5;
    const pitch = 7;
    const w = c * pitch;
    const h = r * pitch;
    const dots: React.ReactNode[] = [];
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        dots.push(
          <circle
            key={`${row}-${col}`}
            cx={col * pitch + dot}
            cy={row * pitch + dot}
            r="1.5"
            fill="currentColor"
            opacity={row === 0 || col === 0 || row === r - 1 ? 0.9 : 0.4}
          />
        );
      }
    }
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w + dot} ${h + dot}`} aria-hidden="true">
        {dots}
      </svg>
    );
  };

  const categories = ['all', ...Array.from(new Set(restaurants.map((r) => r.category.toLowerCase())))];

  const filteredRestaurants = restaurants.filter((r) => {
    if (categoryFilter === 'all') return true;
    return r.category.toLowerCase() === categoryFilter;
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.45), rgba(17, 24, 39, 0.75)), url('/assets/hero.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          color: '#ffffff',
          padding: '120px 24px 60px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
              color: '#dcf1ff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <MapPin size={14} /> Interactive Seat Reservations
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 1rem',
              color: '#ffffff',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            Find your table. Reserve with precision.
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'rgba(255, 255, 255, 0.88)',
              margin: '0 auto 2rem',
              maxWidth: '600px',
              lineHeight: 1.5,
            }}
          >
            Explore dining venues in Chennai, view live table availability in real-time floor plans, and secure your
            reservation in seconds.
          </p>

          <a
            href="#restaurant-list"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: 'var(--radius-control)',
              background: '#1d5fd6',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 8px 24px rgba(29, 95, 214, 0.4)',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Browse Restaurants
            <ChevronRight size={18} />
          </a>
        </div>
      </section>

      {/* Main Content Area */}
      <main id="restaurant-list" className="canvas" style={{ scrollMarginTop: '80px' }}>
        {/* Controls row */}
        <div className="title-row" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Restaurants</h2>
            <p className="subline">
              {loading
                ? 'Loading places…'
                : `${filteredRestaurants.length} places available ${userLocation ? '· nearest first' : 'in Chennai'}`}
            </p>
          </div>

          <div className="title-actions">
            {/* Search Input */}
            <div className="search">
              <Search className="search-icon" size={16} />
              <input
                type="search"
                placeholder="Search by restaurant name…"
                value={query}
                onChange={handleSearchChange}
                aria-label="Search restaurants"
              />
            </div>

            {/* Geolocation Button */}
            <button
              type="button"
              className={`loc-btn ${userLocation ? 'is-active' : ''}`}
              onClick={handleLocateMe}
              disabled={locating}
              title={userLocation ? 'Click to clear location sorting' : 'Sort by nearest first'}
            >
              <NavigationIcon size={15} className={locating ? 'spin' : ''} />
              <span>{locating ? 'Locating…' : userLocation ? 'Near you' : 'Nearby'}</span>
            </button>
          </div>
        </div>

        {/* Location Notice */}
        {locNotice && (
          <div className="loc-notice">
            <AlertCircle size={15} color="#831c1e" />
            <span>{locNotice}</span>
            <button type="button" onClick={setFallbackChennai}>
              Use Chennai Downtown
            </button>
          </div>
        )}

        {/* Category Pills Filter */}
        {categories.length > 2 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: categoryFilter === cat ? 'var(--accent)' : 'var(--border)',
                  background: categoryFilter === cat ? 'var(--accent-soft)' : 'var(--surface)',
                  color: categoryFilter === cat ? 'var(--accent-ink)' : 'var(--muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Restaurant List Panel */}
        <div className="panel" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          {loading ? (
            <ul className="list">
              {[1, 2, 3, 4].map((i) => (
                <li key={i}>
                  <div className="skeleton" aria-hidden="true">
                    <div className="skeleton-tile" />
                    <div className="skeleton-lines">
                      <div className="skeleton-bar" style={{ width: '45%' }} />
                      <div className="skeleton-bar" style={{ width: '25%', marginTop: 8 }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : error ? (
            <div className="error-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button type="button" onClick={() => fetchRestaurants()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
              <p style={{ margin: '0 0 12px', fontSize: '16px' }}>No restaurants found matching your criteria.</p>
              {query && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setQuery('');
                    fetchRestaurants('');
                  }}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <ul className="list">
              {filteredRestaurants.map((r) => {
                const distText = formatDistance(r.distance_km);
                return (
                  <li key={r.id}>
                    <div
                      className="row"
                      onClick={() => navigate(`/restaurants/${r.id}`)}
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/restaurants/${r.id}`);
                      }}
                    >
                      <span className="grid-tile" title="Venue floorplan preview">
                        {renderFloorplan(r.grid_rows, r.grid_cols)}
                      </span>
                      <span className="row-text">
                        <span className="row-name" style={{ fontSize: '17px', fontWeight: 600 }}>
                          {r.name}
                        </span>
                        <span className="row-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              textTransform: 'uppercase',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: r.category.toLowerCase().includes('veg') && !r.category.toLowerCase().includes('non') ? '#e6f7ec' : '#fff0ee',
                              color: r.category.toLowerCase().includes('veg') && !r.category.toLowerCase().includes('non') ? '#137333' : '#c5221f',
                            }}
                          >
                            {r.category}
                          </span>
                          <span>•</span>
                          <span>
                            {r.floors} {r.floors === 1 ? 'floor' : 'floors'}
                          </span>
                          <span>•</span>
                          <span>{r.tables} tables</span>
                        </span>
                      </span>

                      {distText && <span className="row-dist num" style={{ fontWeight: 500 }}>{distText}</span>}

                      <ChevronRight className="row-chevron" size={18} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};
