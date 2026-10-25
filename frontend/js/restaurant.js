const nameEl = document.getElementById("name");
const sublineEl = document.getElementById("subline");
const tabsEl = document.getElementById("tabs");
const gridEl = document.getElementById("seat-grid");
const emptyEl = document.getElementById("empty");
const panelHeadEl = document.getElementById("panel-head");
const countEl = document.getElementById("count");
const dateEl = document.getElementById("date");
const slotEl = document.getElementById("slot");
const bookBarEl = document.getElementById("book-bar");
const bookSummaryEl = document.getElementById("book-summary");
const bookNoticeEl = document.getElementById("book-notice");
const bookBtnEl = document.getElementById("book-btn");

const SLOTS = ["12:00", "13:00", "14:00", "19:00", "20:00", "21:00"];

const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("id");
if (!restaurantId) window.location.replace("/");

const selected = new Set();
let floors = [];
let activeFloorId = null;
let booking = false;
let currentUser = null;
let holdContext = null;
let holdExpiresAt = null;
let holdTimerId = null;
let holdSyncSeq = 0;

const bookTimerEl = document.getElementById("book-timer");

function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function setSubline(restaurant, floorCount, tableCount) {
  sublineEl.textContent =
    `${restaurant.category} · ${floorCount} ${floorCount === 1 ? "floor" : "floors"} · ` +
    `${tableCount} tables`;
}

function updateCount() {
  countEl.textContent = `${selected.size} selected`;
}

function hideNotice() {
  bookNoticeEl.hidden = true;
  bookNoticeEl.textContent = "";
}

function showNotice(text) {
  bookNoticeEl.textContent = text;
  bookNoticeEl.hidden = false;
  updateBookBar();
}

function stopHoldTimer() {
  if (holdTimerId !== null) {
    clearInterval(holdTimerId);
    holdTimerId = null;
  }
  holdExpiresAt = null;
  bookTimerEl.hidden = true;
  bookTimerEl.textContent = "";
}

function updateTimerText() {
  const remain = Math.ceil((holdExpiresAt - Date.now()) / 1000);
  if (remain <= 0) return;
  const m = Math.floor(remain / 60);
  const s = remain % 60;
  bookTimerEl.textContent = `Held for ${m}:${s < 10 ? "0" + s : s}`;
  bookTimerEl.hidden = false;
}

function startHoldTimer() {
  if (holdTimerId !== null) clearInterval(holdTimerId);
  updateTimerText();
  holdTimerId = setInterval(() => {
    if (holdExpiresAt === null) return stopHoldTimer();
    if (holdExpiresAt - Date.now() <= 0) {
      stopHoldTimer();
      const hadSelection = selected.size > 0;
      selected.clear();
      updateSelectionUI();
      loadSeats().then(() => {
        if (hadSelection) showNotice("Your hold expired. Pick the tables again to hold them.");
      });
      return;
    }
    updateTimerText();
  }, 500);
}

async function postHolds(seats, date, slot) {
  const res = await fetch("/api/holds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seats, date, slot }),
  });
  if (res.status === 401) return { skipped: true };
  if (!res.ok) return { skipped: true };
  return res.json();
}

async function syncHolds() {
  if (!currentUser || !dateEl.value || !slotEl.value) return;
  const context = { date: dateEl.value, slot: slotEl.value };
  const changed =
    holdContext &&
    (holdContext.date !== context.date || holdContext.slot !== context.slot);
  if (changed) {
    await postHolds([], holdContext.date, holdContext.slot);
    holdContext = null;
    stopHoldTimer();
  }
  try {
    const seq = ++holdSyncSeq;
    const data = await postHolds([...selected], context.date, context.slot);
    if (seq !== holdSyncSeq) return;
    holdContext = context;
    if (data.skipped || !data.expires_at) return stopHoldTimer();
    holdExpiresAt = Date.parse(data.expires_at);
    startHoldTimer();
  } catch (err) {
    /* next click will retry */
  }
}

function updateBookBar() {
  bookBarEl.hidden = selected.size === 0 && bookNoticeEl.hidden;
  bookSummaryEl.hidden = selected.size === 0;
  if (selected.size > 0) {
    const chosen = allSeats().filter((s) => selected.has(s.id));
    const capacity = chosen.reduce((n, s) => n + s.capacity, 0);
    bookSummaryEl.textContent =
      `${selected.size} ${selected.size === 1 ? "table" : "tables"} · ` +
      `${capacity} seats`;
  }
}

function updateSelectionUI() {
  updateCount();
  updateBookBar();
}

function allSeats() {
  return floors.flatMap((f) => f.seats);
}

function pruneSelection() {
  const bookable = new Set(
    allSeats().filter((s) => s.status === "free").map((s) => s.id)
  );
  for (const id of [...selected]) {
    if (!bookable.has(id)) selected.delete(id);
  }
}

function seatState(seat) {
  if (seat.status === "booked") return "booked";
  if (seat.status === "held") return "held";
  if (selected.has(seat.id)) return "selected";
  return "free";
}

function seatHtml(seat) {
  const state = seatState(seat);
  const interactive = state === "free" || state === "selected";
  const tag = interactive ? "button" : "div";
  const attrs = state === "held"
    ? ` aria-disabled="true" aria-label="Table ${seat.label}, held by another diner, ${seat.capacity} seats"`
    : state === "booked"
      ? ` aria-disabled="true" aria-label="Table ${seat.label}, booked, ${seat.capacity} seats"`
      : ` type="button" data-id="${seat.id}" aria-pressed="${state === "selected"}"` +
        ` aria-label="Table ${seat.label}, ${state}, ${seat.capacity} seats"`;
  return `<${tag} class="seat ${state}"` +
    ` style="grid-row:${seat.row};grid-column:${seat.col}"${attrs}>` +
    `<span class="seat-label">${seat.label}</span>` +
    `<span class="seat-cap">${seat.capacity}</span>` +
    `</${tag}>`;
}

function renderGrid() {
  const floor = floors.find((f) => f.id === activeFloorId);
  emptyEl.hidden = true;
  panelHeadEl.hidden = false;

  if (!floor || floor.seats.length === 0) {
    gridEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.innerHTML = `<span class="empty-box">No tables on this floor yet.</span>`;
    return;
  }

  const cols = Math.max(...floor.seats.map((s) => s.col));
  gridEl.style.setProperty("--cols", cols);
  gridEl.innerHTML = floor.seats.map(seatHtml).join("");
}

function renderTabs() {
  tabsEl.hidden = floors.length === 0;
  tabsEl.innerHTML = floors
    .map(
      (f) =>
        `<button class="tab" type="button" role="tab" data-id="${f.id}" ` +
        `aria-selected="${f.id === activeFloorId}">${f.name}</button>`
    )
    .join("");
}

function showSkeleton() {
  gridEl.style.setProperty("--cols", 5);
  gridEl.innerHTML = Array.from({ length: 20 }, () =>
    `<div class="skeleton-seat" aria-hidden="true"></div>`
  ).join("");
}

function showError() {
  gridEl.innerHTML = "";
  panelHeadEl.hidden = true;
  hideNotice();
  updateBookBar();
  emptyEl.hidden = false;
  emptyEl.innerHTML =
    `<span class="error-box">Couldn’t load tables.` +
    `<button type="button" id="retry">Retry</button></span>`;
  document.getElementById("retry").addEventListener("click", () => {
    loadDetails();
    loadSeats();
  });
}

async function loadDetails() {
  if (!restaurantId) return;
  sublineEl.textContent = "Loading place…";
  try {
    const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}`);
    if (res.status === 404) throw new Error("not found");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    nameEl.textContent = data.restaurant.name;
    document.title = `${data.restaurant.name} · RevRes`;
    setSubline(data.restaurant, data.floors.length, data.seats.length);
    sublineEl.dataset.floors = data.floors.length;
    sublineEl.dataset.tables = data.seats.length;
  } catch (err) {
    showError();
  }
}

async function fetchSeats() {
  const qs = new URLSearchParams({ date: dateEl.value, slot: slotEl.value });
  const res = await fetch(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/seats?${qs}`
  );
  if (res.status === 404) throw new Error("not found");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function applySeats(data) {
  floors = data.floors;
  if (!floors.some((f) => f.id === activeFloorId)) {
    activeFloorId = floors.length ? floors[0].id : null;
  }
  pruneSelection();
  renderTabs();
  renderGrid();
  updateSelectionUI();
}

async function loadSeats() {
  if (!restaurantId || !dateEl.value || !slotEl.value) return;
  hideNotice();
  showSkeleton();
  try {
    applySeats(await fetchSeats());
  } catch (err) {
    showError();
  }
}

async function confirmBooking() {
  if (selected.size === 0 || booking) return;
  booking = true;
  bookBtnEl.disabled = true;
  try {
    const fresh = await fetchSeats();
    const freshStatus = new Map();
    fresh.floors
      .flatMap((f) => f.seats)
      .forEach((s) => freshStatus.set(s.id, s.status));
    const stale = [...selected].some((id) => freshStatus.get(id) !== "free");
    const staleHeld = [...selected].some((id) => freshStatus.get(id) === "held");
    applySeats(fresh);
    if (stale) {
      showNotice(
        staleHeld
          ? "Another diner is holding those tables."
          : "Those tables were just taken. The map has been refreshed."
      );
      return;
    }
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seats: [...selected],
        date: dateEl.value,
        slot: slotEl.value,
      }),
    });
    if (res.status === 401) {
      const next = encodeURIComponent(
        `restaurant.html${window.location.search}`
      );
      window.location.href = `login.html?next=${next}`;
      return;
    }
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      await loadSeats();
      showNotice(
        data.error === "seat held by someone else"
          ? "Another diner is holding those tables."
          : "Those tables were just taken. The map has been refreshed."
      );
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    stopHoldTimer();
    window.location.href = "bookings.html";
  } catch (err) {
    showNotice("Couldn’t book those tables. Try again.");
  } finally {
    booking = false;
    bookBtnEl.disabled = false;
  }
}

tabsEl.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  activeFloorId = Number(tab.dataset.id);
  renderTabs();
  renderGrid();
});

gridEl.addEventListener("click", (e) => {
  const seatEl = e.target.closest("button.seat");
  if (!seatEl) return;
  const id = Number(seatEl.dataset.id);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  const state = selected.has(id) ? "selected" : "free";
  seatEl.className = `seat ${state}`;
  seatEl.setAttribute("aria-pressed", String(selected.has(id)));
  hideNotice();
  updateSelectionUI();
  syncHolds();
});

function onContextChange() {
  selected.clear();
  stopHoldTimer();
  loadSeats().then(syncHolds);
}

dateEl.addEventListener("change", onContextChange);
slotEl.addEventListener("change", onContextChange);
bookBtnEl.addEventListener("click", confirmBooking);

slotEl.innerHTML = SLOTS.map((s) => `<option value="${s}">${s}</option>`).join("");
dateEl.value = todayString();
slotEl.value = "19:00";

loadDetails();
loadSeats();

window.revresAuth.then((user) => {
  currentUser = user;
  if (user && selected.size > 0) syncHolds();
});
