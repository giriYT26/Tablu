# Tablu · Restaurant Seat Booking & Reservations

A modern restaurant seat reservation platform modeled on cinema-style interactive seating. Diners can browse restaurants in Chennai sorted by distance, explore venue floors, view live table availability in real time, place 5-minute holds, and reserve tables. Administrators have full control over restaurant listings, floors, and table layouts.

---

## Features

- **Interactive Seat Map**: Real-time 2D floor grid showing live statuses:
  - ⚪ **Available** (Free to select)
  - 🔵 **Selected** (Active diner selection)
  - 🟡 **Held** (5-minute hold protection preventing snipes)
  - 🔴 **Booked** (Unavailable / Reserved)
- **StaggeredMenu Navigation**: Open-source GSAP-animated menu from React Bits adapted for responsive desktop and mobile navigation.
- **Cinematic Hero**: Upscale restaurant evening atmosphere welcoming diners.
- **Location-Aware Sorting**: Uses the browser Geolocation API and Haversine formula to sort venues nearest-first, with fallback for Chennai downtown.
- **Search & Category Filters**: Instant search by restaurant name and category pills (Non-veg, Veg, Cafe, etc.).
- **5-Minute Anti-Snipe Holds**: Reserving a table locks it temporarily with a live countdown timer before final booking.
- **User Accounts & Bcrypt Security**: Multi-user registration and login secured with `bcrypt` (12 rounds) and transparent upgrade of legacy hashes.
  - Quick test credentials: `guest / guest123` & `admin / admin123`.
- **My Bookings**: View upcoming reservations and cancel anytime.
- **Admin Management (Full CRUD)**:
  - Add, edit, and delete restaurants (with cascading floor/seat deletion).
  - Add multiple venue floors (e.g., Ground, Rooftop, First).
  - Visual 2D Table Editor: Add, reposition, resize capacity, or delete tables on the interactive grid.

---

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | Fast Single Page Application (SPA) |
| **Animation** | GSAP 3 | StaggeredMenu drawer and entrance transitions |
| **Routing** | React Router DOM v7 | Client-side routing with SPA fallback |
| **Icons** | Lucide React | Clean, accessible iconography |
| **Styling** | Vanilla CSS (`index.css`) | Design tokens from `.taste-skill` (pastel cobalt palette, Manrope typography, 20px card radius) |
| **Backend** | Python 3, Flask | RESTful JSON API and SPA server |
| **Security** | `bcrypt` | Industry-standard password hashing (cost factor 12) |
| **Database** | SQLite3 (`PRAGMA foreign_keys = ON`) | Relational database with strict uniqueness constraints |

---

## Project Structure

```
Tablu/
├── backend/
│   ├── app.py              # Flask server, API routes, SPA static serving
│   ├── db.py               # SQLite connection helper (foreign keys enabled)
│   ├── security.py         # bcrypt password hashing & rehash checks
│   ├── schema.sql          # DB schema (restaurants, floors, seats, bookings, users, holds)
│   ├── seed.py             # Database seed data generator
│   ├── restaurant.db       # SQLite database file
│   └── venv/               # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.tsx                  # Global header & StaggeredMenu wrapper
│   │   │   └── StaggeredMenu/                  # React Bits GSAP animated menu
│   │   ├── context/
│   │   │   └── AuthContext.tsx                 # Authentication state & session manager
│   │   ├── pages/
│   │   │   ├── HomePage.tsx                    # Hero, search, nearby sort, restaurant cards
│   │   │   ├── RestaurantDetailPage.tsx        # 2D table grid, hold timer, booking action
│   │   │   ├── BookingsPage.tsx                # User reservations & cancellation
│   │   │   ├── LoginPage.tsx                   # Sign in & registration + quick demo credentials
│   │   │   └── AdminPage.tsx                   # Restaurant CRUD & interactive table layout editor
│   │   ├── App.tsx                             # Main Router component
│   │   ├── index.css                           # Core design system tokens (.taste-skill)
│   │   └── main.tsx                            # React entrypoint
│   ├── public/
│   │   └── assets/
│   │       └── hero.jpg                        # High-resolution restaurant hero photography
│   ├── vite.config.ts                          # Vite config with API proxy to port 5000
│   └── package.json
├── README.md
├── ARCHITECTURE.md
├── WORKFLOW.md
└── AGENT.md
```

---

## Running Locally

### 1. Backend Setup

To start the Flask backend directly:

```powershell
cd backend
.\venv\Scripts\python.exe app.py
```

> **Note on Initial Setup (First time only):**
> If you are setting up fresh or recreating the database:
> ```powershell
> cd backend
> python -m venv venv
> .\venv\Scripts\python.exe -m pip install flask bcrypt
> .\venv\Scripts\python.exe seed.py
> .\venv\Scripts\python.exe app.py
> ```

### 2. Frontend Setup (Development Mode with HMR)

In a new terminal:

```powershell
cd frontend

# Install npm packages
npm install

# Start Vite dev server (runs on port 5173 with proxy to backend)
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Production Build & Serving via Flask

When building for production:

```powershell
cd frontend
npm run build
```

Flask will automatically detect `frontend/dist/` and serve the compiled single-page application at `http://127.0.0.1:5000/`.

---

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): Data model, API specs, security, and concurrency controls.
- [WORKFLOW.md](WORKFLOW.md): Development phases and progress log.
- [AGENT.md](AGENT.md): Guidelines and boundaries for AI assistants.
