# Workflow

How the project gets built, phase by phase.

## Working Process

- Build in small vertical slices: finish something that works end to end before starting the next piece.
- Test each piece in the browser and with API requests before moving on.
- Commit after every working step, with a clear, descriptive message.
- Adhere to the `.taste-skill` design system (pastel consumer aesthetic, clean typography, rounded surfaces).

---

## Git Basics

- `main` always holds working, buildable code.
- Commit messages: structured conventional commits (`feat: ...`, `fix: ...`, `refactor: ...`).

---

## Phases

### Phase 1: Database and seed data
- [x] Write `schema.sql` for the relational tables, including the UNIQUE constraints
- [x] Write `seed.py` with 5 restaurants, 2 floors each, and a grid of seats per floor
- [x] Add `GET /api/restaurants` returning the venue list
- **Done when:** visiting the endpoint in the browser returns valid JSON.

### Phase 2: Restaurant list and search
- [x] Build restaurant cards with floorplan dot-grid previews
- [x] Fetch from API and render with live search filter
- **Done when:** typing in the search bar narrows the list.

### Phase 3: Seat map
- [x] Build seat map view with floor tabs
- [x] Render the seat grid from row and col values
- [x] Interactive table selection state with color indicators
- **Done when:** the seat grid reflects venue tables correctly.

### Phase 4: Real availability
- [x] Add `GET /api/restaurants/<id>/seats?date=&slot=`
- [x] Add date and time-slot selectors
- [x] Replace mock availability with real database statuses
- **Done when:** changing the slot changes which seats are booked.

### Phase 5: Booking and cancellation
- [x] Add `POST /api/bookings` (atomic transaction, 409 on conflict)
- [x] Add confirmation bar with capacity calculation
- [x] Add `GET /api/bookings` and cancellation endpoint `DELETE /api/bookings/<id>`
- **Done when:** users can reserve tables and cancel reservations.

### Phase 6: Location and polish
- [x] Geolocation Haversine distance sorting
- [x] Handle permission denied with downtown fallback
- [x] Empty states, error messages, and loading skeletons
- [x] Responsive layout for mobile and desktop screens
- **Done when:** nearest restaurants appear first.

### Phase 7: Auth, holds, and floor editor
- [x] Login and user sessions
- [x] 5-minute temporary anti-snipe holds with countdown timer
- [x] Admin floor and seat layout editor

### Phase 8: Modern React + Vite Migration & Security Upgrade
- [x] Upgrade password hashing from PBKDF2 to **bcrypt** with transparent migration on login
- [x] Add admin restaurant CRUD endpoints (`POST`, `PATCH`, `DELETE` with cascade deletion)
- [x] Convert frontend to **React 19 + TypeScript + Vite** SPA architecture
- [x] Integrate React Bits **`<StaggeredMenu />`** component animated with GSAP
- [x] Generate and install high-resolution cinematic restaurant hero image (`/assets/hero.jpg`)
- [x] Implement comprehensive React page suite:
  - `HomePage`: Hero banner, search bar, nearby sorting, category filtering, restaurant cards
  - `RestaurantDetailPage`: Interactive 2D table grid, live seat statuses, hold timer, reservation booking
  - `BookingsPage`: User reservations view and cancellation flow
  - `LoginPage`: Authentication & registration with quick 1-click test credentials
  - `AdminPage`: Full restaurant CRUD and visual table layout editor
- [x] Configure Flask SPA fallback to serve production React bundle directly
- [x] Remove legacy vanilla frontend files after migration

---

## Definition of Done (per phase)

- It works in the browser and passes automated end-to-end checks
- No errors in console or server logs
- TypeScript compiles cleanly with zero warnings/errors (`npm run build`)
- Documentation (README, ARCHITECTURE, WORKFLOW) updated

---

## Progress Log

| Date | Phase | Notes |
|---|---|---|
| 2026-10-24 | 1 | `schema.sql`, `db.py`, `seed.py` (5 restaurants x 2 floors x 20 seats), `GET /api/restaurants` verified returning JSON. |
| 2026-10-24 | 2 | `design-taste-frontend` app mode: pastel-consumer sheet, Manrope, floorplan dot-grid tiles, server-side filter. |
| 2026-10-24 | 3 | Underline floor tabs, floorplan-style seat grid filling the panel, select/deselect with count. |
| 2026-10-24 | 4 | Real availability endpoint grouped by floor with free/booked status; date + time controls; seed bookings. |
| 2026-10-24 | 5 | Atomic booking endpoint (`POST /api/bookings`), `GET /api/bookings`, cancellation endpoint (`DELETE /api/bookings/<id>`). |
| 2026-10-24 | 6 | Haversine distance sorting on `GET /api/restaurants?lat=&lng=`, browser Geolocation API, fallback notice. |
| 2026-10-25 | 7 | Auth + holds + admin. Users and holds tables, session cookies, 5-min TTL hold timer, admin floor/seat CRUD. |
| 2026-10-25 | 8 | **React + Vite Migration, StaggeredMenu, Restaurant CRUD & Bcrypt**: Upgraded hashing to bcrypt (cost factor 12) with transparent login re-hashing; added full admin restaurant CRUD (`POST`, `PATCH`, `DELETE` with cascade deletion); rebuilt frontend with Vite + React + TypeScript; integrated StaggeredMenu navigation from React Bits with GSAP; implemented full page components; added new cinematic hero image; configured Flask SPA static route fallback; passed end-to-end automated testing; removed legacy frontend. |
