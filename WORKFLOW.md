# Workflow

How the project gets built, phase by phase. Tick boxes as you go.

## Working Process

- Build in small vertical slices: finish something that works end to end before starting the next piece.
- Test each piece in the browser or with a request to the API before moving on.
- Commit after every working step, with a message that says what changed.
- When stuck, write down what you expected versus what happened before asking for help.
- Frontend phases (2–7) go through the `design-taste-frontend` skill: deal a direction before
  writing HTML, and pass `lint.mjs` + `inspect.mjs` (0 FAIL) before a page counts as done. The pages
  are app screens, so use `draw.mjs --app` and follow `references/app-screens.md`.
- If a needed capability is missing, use `find-skills` (`npx skills find <query>`) before inventing
  a workflow; verify quality per that skill before installing.

## Git Basics

- `main` always holds working code.
- One branch per phase, e.g. `phase-3-seat-map`. Merge when the phase works.
- Commit messages: short, present tense ("add seats endpoint").

## Phases

### Phase 1: Database and seed data
- [x] Write `schema.sql` for the four tables, including the UNIQUE constraint
- [x] Write `seed.py` with about 5 restaurants, 2 floors each, a grid of seats per floor
- [x] Add `GET /api/restaurants` returning the raw list
- **Done when:** visiting the endpoint in the browser shows JSON

### Phase 2: Restaurant list and search
- [x] Build `index.html` with restaurant cards
- [x] Fetch from the API and render with JS
- [x] Add the search bar (filter by name)
- **Done when:** typing in the search bar narrows the list

### Phase 3: Seat map with fake data
- [x] Build `restaurant.html` with floor tabs
- [x] Render the seat grid from row and col values
- [x] Hardcode some seats as booked
- [x] Click to select and deselect, with color changes
- **Done when:** the map looks and feels right, using fake availability

### Phase 4: Real availability
- [x] Add `GET /api/restaurants/<id>/seats?date=&slot=`
- [x] Add the date and time-slot picker
- [x] Replace fake data with API data, refetch when date or slot changes
- **Done when:** changing the slot changes which seats are red

### Phase 5: Booking and cancellation
- [x] Add `POST /api/bookings` (all or nothing, 409 on conflict)
- [x] Add a confirm button and a summary
- [x] Add `GET /api/bookings` and `bookings.html`
- [x] Add `DELETE /api/bookings/<id>`
- **Done when:** you can book, see it, cancel it, and a double booking is rejected

### Phase 6: Location and polish
- [x] Geolocation plus distance sorting
- [x] Handle permission denied
- [x] Empty states, error messages, loading states
- [x] Responsive layout for phone screens
- **Done when:** the nearest restaurants appear first

### Phase 7 (optional)
- [x] Login and multiple users
- [x] Seat hold timer
- [x] Admin layout editor

## Definition of Done (per phase)

- It works in the browser, not just in theory
- No errors in the console or server log
- Code is committed
- README or docs updated if setup changed

## Progress Log

| Date | Phase | Notes |
|------|-------|-------|
| 2026-10-24 | 1 | schema.sql, db.py, seed.py (5 restaurants x 2 floors x 20 seats), GET /api/restaurants verified returning JSON. Skill usage added to docs. |
| 2026-10-24 | 2 | `design-taste-frontend` app mode: pastel-consumer sheet (seed 752013885, shell redraw to icon rail), Manrope, floorplan dot-grid tiles as the signature element. index.html + css/app.css + js/index.js; ?q= server-side filter; lint 0/0, inspect 0 FAIL (hero-void WARN defended: panel ends where the 5 seed rows end). |
| 2026-10-24 | 3 | GET /api/restaurants/<id> (404 on missing); restaurant.html + restaurant.js: underline floor tabs, floorplan-style seat grid filling the panel, fake booked = seat id % 7 == 0, select/deselect with count. lint 0/0, inspect 0 FAIL/0 WARN, headless click test all green (select, deselect, booked untouchable, floor switch, no page errors). |
| 2026-10-24 | 4 | Seats endpoint grouped by floor with free/booked status (400 on bad date/slot, 404 unknown); seed adds sample bookings (6+3 today, 4 tomorrow per restaurant); date + time controls; fake %7 removed; selection pruned when a seat turns booked. Browser proof: 5 red @19:00 → 0 @13:00 → 5, prune works, no page errors. lint one defended WARN (date zero-padding), inspect 0/0. |
| 2026-10-24 | 5 | POST /api/bookings validates then inserts in one transaction (pre-check 409 with conflict ids, UNIQUE constraint as race backstop, only IntegrityError→409), GET /api/bookings (guest user, joined names), DELETE /api/bookings/<id> (204/404). Confirm bar on restaurant page: pre-confirm refetch detects stale map, 409 path refreshes with notice, success navigates to bookings.html. bookings.html list with ghost Cancel (confirm names object, decline keeps row), rail gets Bookings on all pages. curl: 201/409/400s, mixed free+taken rolls back (seat not booked). Headless E2E: book → row appears → decline keeps → accept removes → seat free again; subline 66→65; zero page errors. lint 0 FAIL/1 defended WARN, inspect restaurant 0/0, bookings 0 FAIL/1 hero-void WARN defended (trailing-column row layout closes the space on the far side; mobile stacks clean). Test DB restored to seed state (65 bookings). |
| 2026-10-24 | 6 | Haversine distance on GET /api/restaurants?lat=&lng= (400 if malformed/out of range or lat/lng given singly), sorted ascending with distance_km. index.html: "Use my location" control (idle → Locating… → Near you toggle), denied/unavailable fallback notice with Try again, distance labels in rows ("1.9 km away"), subline "nearest first", search + location params combined. Bug found by looking at screenshots: component display rules overrode the UA [hidden] rule (denied notice stayed visible after grant) → global [hidden] { display: none !important } (also fixed latent .book-bar/.tabs/.panel-head). All 7 em-dashes removed (lint em-dash warn cleared). Headless geo E2E: denied path (notice + rows intact), granted path (T Nagar Tandoor 0 m first, ascending), search+location, clear, phone; Phase 5 E2E re-run green after the CSS fix; zero page errors. Gates: lint 0 FAIL/1 defended WARN; inspect restaurant 0/0, index 0/1 hero-void defended (5 seed rows end, rest is deliberate rest), bookings 0/1 defended. All three pages' phone renders reviewed. Test DB back to seed state. |
| 2026-10-25 | 7 | Auth + holds + admin. Backend: users/holds tables, security.py (PBKDF2 260k), /api/me /register /login /logout, POST /api/holds (5-min TTL, lazy expiry, sync-mine semantics), admin floor/seat CRUD (fix: seat dupe check now scoped to floor_id — cross-floor r1c1 no longer 400s). Frontend: login.html+login.js (mode toggle, ?next= open-redirect guard allowing relative paths), auth.js rail account (SVG initial hidden via setAttribute — `icon.hidden` is a no-op on SVG), restaurant.html Held legend + book-timer (hold sync only on seat click/context change, 401→login, expiry clears selection), bookings 401 redirects, admin.html+admin.js (shared h1 outside both state boxes so the probe finds it; guest gate = centered capped card; create mode scans first free grid slot). Phone fix: stacked auth-actions (full-width btn-primary was pushing links out of the panel). E2E ph7test.mjs all green twice (redirects, holds, 409 held message, admin CRUD, dupe notice, forbidden gate, pageErrors []). Headless-only quirk: Chrome auto-rejects JS dialogs before CDP can handle them — tests stub window.confirm instead. T21 "blue tile" investigated to pixel level: borders/fills identical to neighbours (dash=47/gap=49/blue=0 both) — downscale artifact, no bug. Gates: lint 0 FAIL/1 defended WARN; inspect index 0/1 defended, restaurant 0/0, login 0/1 defended, admin 0/1 defended (all renders + phone reviewed). |
| 2026-10-25 | hero | Home hero redesigned as a scroll dive: user rejected the SVG illustration as unrealistic → single CC photograph zooming on scroll (260vh desktop / 200vh track, sticky stage, unitless `--p` from a rAF scrub in index.js, scene `scale(1 + p*0.85)` at origin 50%/46%, 72px mask fade into the box). Photo: "Basmati Kacchi Biryani (2)" by Nahian CC BY 4.0 via Wikimedia Commons, resized 2400x2032 615KB at assets/hero.jpg, credits.json + on-page credit line. Copy as solid-surface chips (glass dropped for lint): title "Sit down to something good." at 38%, interstitial lines "Steam's still rising off the plates." / "All that's missing is you." at 54% with fade windows 0.30-0.50 / 0.56-0.80, dark hint chip at 88px. covered-text FAIL fixed: probe forces pointer-events and hit-tested the invisible line chips stacked on the title center — separated the slots (38% vs 54%) instead of z-index games. direction.json allow now carries colour-sprawl (40% is the photograph, UI chrome stays neutral) + icon-chips; pitfall: PowerShell 5.1 Set-Content -Encoding UTF8 writes a BOM that kills JSON.parse → lost app mode and produced 7 bogus FAILs — rewrote with UTF8Encoding(false). Gates: lint 0 FAIL/1 defended WARN; inspect index 0 FAIL/0 WARN at 1440/768/390, all renders judged; ph7test.mjs green (pageErrors []); DB re-seeded to 65 bookings. |
