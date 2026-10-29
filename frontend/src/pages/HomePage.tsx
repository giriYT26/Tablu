import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Navigation as NavigationIcon,
  ArrowUpRight,
  MapPin,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Layers,
  Armchair,
  Utensils,
} from 'lucide-react';

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

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const toneFor = (id: number) => `tone-${id % 5}`;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchRestaurants(val, userLocation);
  };

  const scrollToList = () => {
    document.getElementById('restaurant-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLocateMe = () => {
    if (userLocation) {
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
        setLocNotice(`Location access was denied (${err.message}).`);
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
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const renderFloorplan = (rows = 4, cols = 4) => {
    const r = Math.min(Math.max(rows, 2), 6);
    const c = Math.min(Math.max(cols, 2), 6);
    const dot = 3;
    const pitch = 6;
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
            r="1.4"
            fill="currentColor"
            opacity={row === 0 && col === 0 ? 0.35 : 0.85}
          />
        );
      }
    }
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
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
    <div>
      {/* ---------------- hero ---------------- */}
      <section className="hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-inner">
          <span className="hero-eyebrow">
            <span className="live-dot" />
            Chennai · Live table availability
          </span>

          <h1>
            Your table
            <br />
            is <em>waiting.</em>
          </h1>

          <p className="hero-lede">
            Skip the phone call. See the real floor plan, pick the exact table you want, and lock it in
            before someone else does.
          </p>

          <div className="hero-search">
            <div className="search">
              <Search className="search-icon" size={18} />
              <input
                type="search"
                placeholder="Search restaurants by name…"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') scrollToList();
                }}
                aria-label="Search restaurants"
              />
            </div>

            <button
              type="button"
              className={`loc-btn ${userLocation ? 'is-active' : ''}`}
              onClick={handleLocateMe}
              disabled={locating}
              title={userLocation ? 'Clear location sorting' : 'Sort restaurants by distance'}
            >
              <NavigationIcon size={15} className={locating ? 'spin' : ''} />
              <span>{locating ? 'Locating…' : userLocation ? 'Near you' : 'Near me'}</span>
            </button>

            <button type="button" className="btn-primary" onClick={scrollToList}>
              Explore
              <ArrowUpRight size={16} />
            </button>
          </div>

          <ul className="hero-facts">
            <li>
              <CheckCircle2 size={14} /> Real-time seat status
            </li>
            <li>
              <Sparkles size={14} /> Instant confirmation
            </li>
            <li>
              <MapPin size={14} /> Five venues across the city
            </li>
          </ul>
        </div>
      </section>

      {/* ---------------- restaurant list ---------------- */}
      <main id="restaurant-list" className="shell" style={{ scrollMarginTop: '24px' }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Handpicked in Chennai</p>
            <h2>
              {query ? (
                <>
                  Results for <em style={{ fontStyle: 'italic' }}>“{query}”</em>
                </>
              ) : (
                'Choose your next table'
              )}
            </h2>
          </div>
          <p className="section-count">
            {loading
              ? 'Checking availability…'
              : `${filteredRestaurants.length} ${filteredRestaurants.length === 1 ? 'restaurant' : 'restaurants'}${
                  userLocation ? ' · nearest first' : ''
                }`}
          </p>
        </div>

        {locNotice && (
          <div className="loc-notice" style={{ marginBottom: 20 }}>
            <AlertCircle size={15} />
            <span>{locNotice}</span>
            <button type="button" onClick={setFallbackChennai}>
              Use Chennai downtown
            </button>
          </div>
        )}

        <div className="venue-toolbar">
          <div className="chip-row" role="group" aria-label="Filter by cuisine">
            {categories.map((cat) => {
              const count =
                cat === 'all'
                  ? restaurants.length
                  : restaurants.filter((r) => r.category.toLowerCase() === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`chip${categoryFilter === cat ? ' is-active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                  aria-pressed={categoryFilter === cat}
                >
                  {cat === 'all' ? 'All tables' : cat}
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>

          {query && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setQuery('');
                fetchRestaurants('', userLocation);
              }}
            >
              Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="venue-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="card-skeleton" key={i} aria-hidden="true">
                <div className="skeleton-media" />
                <div className="skeleton-body">
                  <div className="skeleton-bar big" style={{ width: '58%' }} />
                  <div className="skeleton-bar" style={{ width: '38%' }} />
                  <div className="skeleton-bar" style={{ width: '24%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <span className="empty-icon">
              <AlertCircle size={24} />
            </span>
            <h3>We couldn’t load the restaurants</h3>
            <p>{error}</p>
            <button type="button" className="btn-primary" onClick={() => fetchRestaurants()}>
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Utensils size={24} />
            </span>
            <h3>No tables match that search</h3>
            <p>Try a different name or clear the filters to see every venue in Chennai.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setQuery('');
                setCategoryFilter('all');
                fetchRestaurants('', userLocation);
              }}
            >
              Show all restaurants
            </button>
          </div>
        ) : (
          <div className="venue-grid">
            {filteredRestaurants.map((r, index) => {
              const distText = formatDistance(r.distance_km);
              return (
                <Link
                  key={r.id}
                  to={`/restaurants/${r.id}`}
                  className="venue-card"
                  style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
                >
                  <div className="venue-media">
                    {r.image ? (
                      <img src={r.image} alt={`${r.name} interior`} loading="lazy" />
                    ) : (
                      <div className={`venue-fallback ${toneFor(r.id)}`} aria-hidden="true">
                        <span className="venue-monogram">{initialsOf(r.name)}</span>
                      </div>
                    )}

                    <span className="venue-tag">{r.category}</span>
                    {distText && (
                      <span className="venue-dist">
                        <NavigationIcon size={11} /> {distText}
                      </span>
                    )}
                    <span className="venue-mini" title="Floor plan preview">
                      {renderFloorplan(r.grid_rows, r.grid_cols)}
                    </span>
                  </div>

                  <div className="venue-body">
                    <h3 className="venue-name">{r.name}</h3>
                    <p className="venue-meta">
                      <Layers size={13} /> {r.floors} {r.floors === 1 ? 'floor' : 'floors'}
                      <span className="dot">•</span>
                      <Armchair size={13} /> {r.tables} tables
                    </p>

                    <div className="venue-foot">
                      <span>View tables & reserve</span>
                      <span className="venue-arrow">
                        <ArrowUpRight size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* ---------------- footer ---------------- */}
      <footer className="site-footer">
        <div className="shell">
          <div className="site-footer-inner">
            <div className="footer-brand">
              <div className="brand" onClick={() => navigate('/')}>
                <span className="brand-mark">
                  <Utensils size={15} />
                </span>
                <span className="brand-word">Tablu</span>
                <span className="brand-city">Chennai</span>
              </div>
              <p>Exact-table reservations for the city’s best dining rooms. No phone calls, no guessing.</p>
            </div>

            <div className="footer-links">
              <div className="footer-col">
                <h4>Explore</h4>
                <Link to="/">Restaurants</Link>
                <Link to="/bookings">My bookings</Link>
              </div>
              <div className="footer-col">
                <h4>Account</h4>
                <Link to="/login">Sign in</Link>
                <Link to="/admin">Admin dashboard</Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Tablu · Made for Chennai diners</span>
            <span>Photo: “Basmati Kacchi Biryani” by Nahian · CC BY 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
