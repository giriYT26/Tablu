# Restaurant Seat Booking

A restaurant booking app modeled on movie-theater seat booking. Browse non-veg restaurants near you, open one, pick a floor, and choose seats on a color-coded map.

> Learning project. Not intended for real-world deployment. It runs locally.

## Features

- Restaurant list (non-veg), sorted by distance from the user
- Search bar to filter restaurants by name
- Restaurant page with date and time-slot picker
- Seat map per floor: gray = free, amber = held by another diner, red = booked, blue = selected
- Accounts: register, log in, log out (`guest / guest123`, `admin / admin123`)
- Selecting a seat holds it for 5 minutes so nobody can snipe it while you decide
- Booking confirmation and a "My Bookings" page with cancel
- Admin layout editor: add floors, create/move/resize/delete tables on the grid

## Tech Stack (proposed)

| Layer    | Choice                          |
|----------|---------------------------------|
| Backend  | Python, Flask                   |
| Database | SQLite                          |
| Frontend | HTML, CSS, vanilla JavaScript   |
| Location | Browser Geolocation API         |

The frontend is the priority. The backend exists to serve JSON and enforce booking rules.

## Project Structure

```
RevRes/
├── backend/
│   ├── app.py          # Flask app and routes
│   ├── db.py           # DB connection helpers
│   ├── security.py     # PBKDF2 password hashing
│   ├── schema.sql      # Table definitions
│   ├── seed.py         # Fake restaurants, floors, seats + demo users
│   └── restaurant.db   # Created by seed.py (gitignored)
├── frontend/           # From Phase 2 onward
│   ├── index.html      # Restaurant list + search
│   ├── restaurant.html # Seat map + booking
│   ├── bookings.html   # My bookings
│   ├── login.html      # Login / register
│   ├── admin.html      # Admin layout editor
│   ├── css/
│   └── js/
├── README.md
├── ARCHITECTURE.md
├── WORKFLOW.md
└── AGENT.md
```

## Running Locally

1. Create and activate a virtual environment:
   `python -m venv backend\venv` then `backend\venv\Scripts\activate`
2. Install Flask: `pip install flask`
3. Create and seed the database:
   `python backend\seed.py` (builds `backend/restaurant.db` from `backend/schema.sql`)
4. Start the Flask server: `python backend\app.py`
5. Open `http://127.0.0.1:5000/api/restaurants` in your browser — you should see JSON.

## Docs

- `ARCHITECTURE.md`: how the system is designed
- `WORKFLOW.md`: build phases and daily working process
- `AGENT.md`: rules for any AI assistant helping on this project

## Agent Skills Used

Two agent skills live in `C:\Users\srika\.agents\skills\` and are used on this project:

| Skill | Used for |
|-------|----------|
| `design-taste-frontend` | Art direction and quality gate for all frontend pages (`index.html`, `restaurant.html`, `bookings.html`). Deals a direction with `scripts/draw.mjs`, then `scripts/inspect.mjs` + `scripts/lint.mjs` gate every page before it counts as done. Requires Node 22+ and Chrome/Edge. |
| `find-skills` | Discovering and installing further skills via `npx skills find <query>` / `npx skills add <pkg>` when a needed capability has no skill yet (see `AGENT.md`). |

The design skill's own docs: `C:\Users\srika\.agents\skills\design-taste-frontend\SKILL.md`. For the seat-map / booking screens (worked-in app screens) it applies in app mode: `references/app-screens.md` and `draw.mjs --app`.

## Status

Phases 1–7 done: database + seed, restaurant list with search, seat map, real date/slot availability, booking with cancellation, location (geolocation sort with distance labels, permission-denied fallback) plus empty/error/loading and phone polish, and Phase 7 — login/multi-user sessions, 5-minute seat holds with countdown, and the admin floor-layout editor. All pages pass the design gate (lint + inspect, 0 FAIL). See `WORKFLOW.md`.
