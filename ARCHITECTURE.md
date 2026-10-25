# Architecture

## 1. Overview

A browser frontend talks to a Flask backend over a JSON API. The backend stores everything in SQLite.

```
Browser (HTML/CSS/JS)  <--- JSON over HTTP --->  Flask  <--->  SQLite
```

The core idea: **Restaurant -> Floors -> Seats -> (Date + Time slot)**. A seat is not "booked" in general. It is booked for a specific date and slot.

## 2. Data Model

### restaurants
| Column    | Notes                      |
|-----------|----------------------------|
| id        | primary key                |
| name      |                            |
| category  | "non-veg" for now          |
| latitude  | used for distance sorting  |
| longitude |                            |
| image     | filename or URL            |

### floors
| Column        | Notes                  |
|---------------|------------------------|
| id            | primary key            |
| restaurant_id | foreign key            |
| name          | e.g. "Ground", "Rooftop" |

### seats
| Column   | Notes                                  |
|----------|----------------------------------------|
| id       | primary key                            |
| floor_id | foreign key                            |
| label    | e.g. "T4"                              |
| row      | grid position, used to draw the map    |
| col      | grid position                          |
| capacity | people per table                       |

### bookings
| Column    | Notes                                |
|-----------|--------------------------------------|
| id        | primary key                          |
| seat_id   | foreign key                          |
| date      | booking date                         |
| time_slot | e.g. "19:00"                         |
| user_name | the session's username (no FK; login decides who owns a booking) |

**Key constraint:** `UNIQUE(seat_id, date, time_slot)`. The database itself prevents double booking, even if application code has a bug or two requests arrive together.

### users
| Column        | Notes                                   |
|---------------|-----------------------------------------|
| id            | primary key                             |
| username      | unique                                  |
| password_hash | PBKDF2-HMAC-SHA256, 260k iterations, per-user salt (`security.py`) |
| is_admin      | 1 = may use the layout editor           |

Seeded accounts: `guest / guest123`, `admin / admin123`.

### holds
| Column    | Notes                                            |
|-----------|--------------------------------------------------|
| id        | primary key                                      |
| seat_id   | foreign key                                      |
| date      |                                                  |
| time_slot |                                                  |
| user_name | who is holding                                   |
| expires_at| UTC ISO timestamp, `created + 300s`              |

**Key constraint:** `UNIQUE(seat_id, date, time_slot)` — one hold per seat per slot, exactly like bookings.

## 3. Seat Status Logic

For a given restaurant, date, and slot:

- `booked` if a bookings row exists for that seat, date, and slot
- `held` if another user's hold is active (not yet expired)
- `free` otherwise — including your own active hold (you may re-select it)

The backend returns `free`, `held`, or `booked`. Expired holds are cleared lazily whenever
availability is read. The frontend adds `selected`.

## 4. API Design

| Method | Endpoint                                   | Purpose                                      |
|--------|--------------------------------------------|----------------------------------------------|
| GET    | `/api/me`                                  | Current session user (or 401)                |
| POST   | `/api/register`                            | Create an account and log in                 |
| POST   | `/api/login`                               | Log in (session cookie)                      |
| POST   | `/api/logout`                              | End the session                              |
| GET    | `/api/restaurants?lat=&lng=&q=`            | List restaurants, sorted by distance, filtered by name |
| GET    | `/api/restaurants/<id>`                    | Restaurant details and its floors            |
| GET    | `/api/restaurants/<id>/seats?date=&slot=`  | Seats grouped by floor, with status (`free` / `held` / `booked`) |
| POST   | `/api/holds`                               | Take/release seat holds (syncs mine for that date+slot; `seats: []` releases all) |
| POST   | `/api/bookings`                            | Book one or more seats (requires login)      |
| GET    | `/api/bookings`                            | The logged-in user's bookings                |
| DELETE | `/api/bookings/<id>`                       | Cancel a booking (owner or admin)            |
| POST   | `/api/admin/restaurants/<id>/floors`       | Add a floor (admin)                          |
| POST   | `/api/admin/floors/<id>/seats`             | Create a table (admin)                       |
| PATCH  | `/api/admin/seats/<id>`                    | Edit label/row/col/capacity (admin)          |
| DELETE | `/api/admin/seats/<id>`                    | Delete a table (admin)                       |

Errors use clear HTTP codes: 400 bad input, 401 not logged in, 403 not admin, 404 not found,
409 seat already taken (booked or held by someone else).

Sessions are signed Flask cookies (`secret_key` regenerated on server start, so restarts log
everyone out). `app.py` is the single gate: booking endpoints require a session, admin endpoints
require `is_admin`.

## 5. Frontend Design

Five pages, each with its own JS file:

- **index**: fetches restaurants, renders cards, handles search and geolocation
- **restaurant**: date and slot picker, floor tabs, seat grid, selection state, hold timer, confirm button
- **bookings**: lists bookings, cancel button; redirects to login when the session ends
- **login**: login and registration modes, `?next=` return path
- **admin**: floor tabs, seat grid, edit/create/delete tables; guests see a gated state

The seat grid is built by looping over seats and placing each at its `row` and `col`. Nothing about the layout is hardcoded in HTML.

Color states are CSS classes: `.seat.free`, `.seat.booked`, `.seat.held`, `.seat.selected`.
A hold shows a 5-minute countdown in the confirm bar; when it expires the selection is cleared
and the seat reloads. `js/auth.js` runs on every page and drives the rail's login/account state.

### 5.1 Visual design process

The look of all three pages is decided by the `design-taste-frontend` agent skill, not improvised
per page. These screens are *app screens* (worked in, not scrolled), so the skill runs in app mode:
one dealt style shared by all pages (`draw.mjs --app --keep palette,type` when a brand colour/type
is fixed), tokens as CSS custom properties, and the gate (`lint.mjs`, `inspect.mjs --app`) run
before a page is done. The data model and API above are unaffected by the skill; it styles what
Phase 2+ builds, it does not shape it.

## 6. Location Handling

1. Browser asks for permission and returns latitude and longitude.
2. Frontend sends them to `/api/restaurants`.
3. Backend computes distance per restaurant (Haversine formula) and sorts.
4. If permission is denied, fall back to an unsorted list or a manual area picker.

## 7. Concurrency and Integrity

- Booking multiple seats in one request must be **all or nothing** (a single transaction).
- If any seat is already taken, return 409 and book none.
- The frontend refetches seat status before confirming, since the map may be stale.
- A hold reserves a seat for 5 minutes so the picker is not sniped mid-decision; holds and
  bookings share the `UNIQUE(seat_id, date, time_slot)` pattern, and booking checks both tables.

## 8. Out of Scope (for now)

- Deployment and hosting
- Payments
- Veg and other categories

## 9. Future Ideas

- Real map view of restaurants
