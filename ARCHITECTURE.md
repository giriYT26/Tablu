# Architecture

## 1. Overview

Tablu is built as a decoupled web application consisting of a modern React SPA frontend communicating with a lightweight Flask JSON API backend backed by an ACID-compliant SQLite relational database.

```
+-------------------------------------------------------------+
|                     Browser Client                          |
|  React 19 + TypeScript + Vite + GSAP (StaggeredMenu) SPA   |
+------------------------------+------------------------------+
                               |
                   HTTP JSON API & Static Dist
                               |
+------------------------------v------------------------------+
|                     Flask Backend                           |
|       Authentication (bcrypt) · Booking Engine · Admin      |
+------------------------------+------------------------------+
                               |
                        Python sqlite3
                               |
+------------------------------v------------------------------+
|                     SQLite Database                         |
|      restaurants · floors · seats · bookings · users · holds |
+-------------------------------------------------------------+
```

The fundamental relational model is:
**Restaurant -> Floors -> Seats -> (Date + Time slot)**

A seat is not booked globally; it is reserved for a specific calendar date (`YYYY-MM-DD`) and time slot (`HH:MM`).

---

## 2. Data Model

### `restaurants`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing venue ID |
| `name` | TEXT NOT NULL | Restaurant name |
| `category` | TEXT NOT NULL | Cuisine / category (e.g., 'Non-veg', 'North Indian', 'Cafe') |
| `latitude` | REAL NOT NULL | Geographic latitude for distance calculation (-90 to 90) |
| `longitude` | REAL NOT NULL | Geographic longitude (-180 to 180) |
| `image` | TEXT | Image path or URL |

### `floors`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing floor ID |
| `restaurant_id`| INTEGER NOT NULL | References `restaurants(id)` |
| `name` | TEXT NOT NULL | e.g. "Ground", "First Floor", "Rooftop" |

### `seats`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Unique seat identifier |
| `floor_id` | INTEGER NOT NULL | References `floors(id)` |
| `label` | TEXT NOT NULL | e.g., "T1", "A3" |
| `row` | INTEGER NOT NULL | 2D layout row position (1-30) |
| `col` | INTEGER NOT NULL | 2D layout column position (1-30) |
| `capacity` | INTEGER NOT NULL | Table guest seating capacity (default 2) |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Unique booking record ID |
| `seat_id` | INTEGER NOT NULL | References `seats(id)` |
| `date` | TEXT NOT NULL | ISO date `YYYY-MM-DD` |
| `time_slot` | TEXT NOT NULL | Time string `HH:MM` |
| `user_name` | TEXT NOT NULL | Username of diner |

**Key Constraint**: `UNIQUE(seat_id, date, time_slot)` guarantees at the database level that no table can be double-booked for the same time slot, even under concurrent requests.

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | User account ID |
| `username` | TEXT NOT NULL UNIQUE | Lowercase alphanumeric username |
| `password_hash`| TEXT NOT NULL | `bcrypt` hash (`$2b$12$...`) with legacy PBKDF2 backward compatibility |
| `is_admin` | INTEGER NOT NULL | `1` = administrator (access to restaurant CRUD & layout editor), `0` = customer |

### `holds`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Hold record ID |
| `seat_id` | INTEGER NOT NULL | References `seats(id)` |
| `date` | TEXT NOT NULL | Reservation date |
| `time_slot` | TEXT NOT NULL | Reservation time slot |
| `user_name` | TEXT NOT NULL | Diner holding the table |
| `expires_at`| TEXT NOT NULL | UTC ISO timestamp (created + 300 seconds) |

**Key Constraint**: `UNIQUE(seat_id, date, time_slot)` ensures only one user can hold a specific seat at any given moment.

---

## 3. Seat Status Logic

When querying seat availability for a restaurant, date, and slot:

1. **`booked`**: A record exists in `bookings` for that seat, date, and slot.
2. **`held`**: Another diner has an active hold (`expires_at > now`).
3. **`free`**: No booking exists, and either no hold exists or the hold belongs to the requesting user.

Expired holds are cleaned up automatically via `expire_holds(conn)` on read/write operations.

---

## 4. API Endpoints

### Authentication & Account
| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/me` | Return active session user or null | Public |
| `POST` | `/api/register` | Register new user account with bcrypt hashing | Public |
| `POST` | `/api/login` | Authenticate with bcrypt & transparently upgrade legacy hashes | Public |
| `POST` | `/api/logout` | Terminate session cookie | Logged In |

### Diners & Bookings
| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/restaurants` | List restaurants (supports `?q=name` & `?lat=&lng=` Haversine sorting) | Public |
| `GET` | `/api/restaurants/<id>` | Fetch venue info, floors, and seat coordinates | Public |
| `GET` | `/api/restaurants/<id>/seats` | Seat availability map (`booked`, `held`, `user_holds`) for date & slot | Public |
| `POST` | `/api/holds` | Create or sync 5-minute temporary seat hold | Logged In |
| `POST` | `/api/bookings` | Confirm booking for selected seats in single atomic transaction | Logged In |
| `GET` | `/api/bookings` | List active user's reservations | Logged In |
| `DELETE` | `/api/bookings/<id>` | Cancel reservation | Owner / Admin |

### Admin Management
| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/admin/restaurants` | Create restaurant (creates default Ground floor) | Admin only |
| `PATCH` | `/api/admin/restaurants/<id>` | Update restaurant name, category, coordinates, image | Admin only |
| `DELETE` | `/api/admin/restaurants/<id>` | Cascade delete venue, floors, seats, holds, and bookings | Admin only |
| `POST` | `/api/admin/restaurants/<id>/floors` | Add floor to restaurant | Admin only |
| `POST` | `/api/admin/floors/<id>/seats` | Add table to floor grid | Admin only |
| `PATCH` | `/api/admin/seats/<id>` | Edit table label, row, column, capacity | Admin only |
| `DELETE` | `/api/admin/seats/<id>` | Remove table from floor grid | Admin only |

### Static SPA Serving
- `GET /` -> Serves `frontend/dist/index.html`
- `GET /<path:path>` -> Serves static assets if file exists; otherwise falls back to `index.html` for client-side routing.

---

## 5. Frontend Architecture

The frontend is structured as a component-driven Single Page Application (SPA):

- **Routing & Navigation**: `react-router-dom` handles routing across `/`, `/restaurants/:id`, `/bookings`, `/login`, and `/admin`.
- **Global Navigation Bar**: Wraps the **`<StaggeredMenu />`** component from React Bits, utilizing GSAP timelines for smooth underlay layer staggered slide-ins and text transformations.
- **State Management**: `AuthContext.tsx` maintains session state across components and handles login, registration, and logout.
- **Design Tokens (`.taste-skill`)**:
  - Background: `--ground: #f3f5f7`
  - Cards: `--surface: #ffffff`, `--radius-card: 20px`
  - Accent: `--accent: #1d5fd6`, `--accent-soft: #dcf1ff`, `--accent-ink: #0a3a80`
  - Typography: Manrope font with tabular figures for dates, timers, and seat numbers.

---

## 6. Concurrency & Security Controls

- **Atomic Transactions**: Seat reservations insert all chosen seats in a single SQLite transaction. If any seat is taken concurrently, the entire request rolls back and returns `409 Conflict`.
- **Race Condition Prevention**: Database unique indexes `UNIQUE(seat_id, date, time_slot)` enforce integrity even during high-concurrency requests.
- **Password Protection**: Passwords hashed with `bcrypt` using 12 salt rounds. Old PBKDF2 hashes are transparently upgraded to bcrypt on successful authentication.
- **Session Security**: Signed Flask cookies with server-side session secrets. Admin actions require explicit verification of `is_admin == 1`.
