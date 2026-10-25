const sublineEl = document.getElementById("subline");
const restaurantEl = document.getElementById("restaurant");
const floorNameEl = document.getElementById("floor-name");
const addFloorBtn = document.getElementById("add-floor");
const tabsEl = document.getElementById("tabs");
const gridEl = document.getElementById("seat-grid");
const emptyEl = document.getElementById("empty");
const panelHeadEl = document.getElementById("panel-head");
const addSeatBtn = document.getElementById("add-seat");
const editBarEl = document.getElementById("edit-bar");
const editNoticeEl = document.getElementById("edit-notice");
const topNoticeEl = document.getElementById("top-notice");
const saveBtn = document.getElementById("save-seat");
const deleteBtn = document.getElementById("delete-seat");
const labelEl = document.getElementById("f-label");
const rowEl = document.getElementById("f-row");
const colEl = document.getElementById("f-col");
const capEl = document.getElementById("f-cap");

let restaurants = [];
let restaurantId = null;
let details = null;
let activeFloorId = null;
let selectedSeatId = null;
let mode = null;

function showNotice(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideNotice(el) {
  el.hidden = true;
}

function activeFloor() {
  if (!details) return null;
  return details.floors.find((f) => f.id === activeFloorId) || null;
}

function floorSeats() {
  if (!details || activeFloorId === null) return [];
  return details.seats
    .filter((s) => s.floor_id === activeFloorId)
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

function adminSeatHtml(s) {
  const pressed = s.id === selectedSeatId;
  return (
    `<button class="seat admin" type="button" data-id="${s.id}" ` +
    `aria-pressed="${pressed}" ` +
    `style="grid-row:${s.row};grid-column:${s.col}" ` +
    `aria-label="Table ${s.label}, ${s.capacity} seats, edit">` +
    `<span class="seat-label">${s.label}</span>` +
    `<span class="seat-cap">${s.capacity}</span>` +
    `</button>`
  );
}

function renderTabs() {
  tabsEl.hidden = !details || details.floors.length === 0;
  tabsEl.innerHTML = (details ? details.floors : [])
    .map(
      (f) =>
        `<button class="tab" type="button" role="tab" data-id="${f.id}" ` +
        `aria-selected="${f.id === activeFloorId}">${f.name}</button>`
    )
    .join("");
}

function renderGrid() {
  const floor = activeFloor();
  const seats = floorSeats();
  panelHeadEl.hidden = false;
  emptyEl.hidden = true;

  if (!floor) {
    gridEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.innerHTML = `<span class="empty-box">No floors yet. Add one above.</span>`;
    return;
  }
  if (seats.length === 0) {
    gridEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.innerHTML = `<span class="empty-box">No tables on this floor yet.</span>`;
    return;
  }

  const cols = Math.max(...seats.map((s) => s.col));
  gridEl.style.setProperty("--cols", cols);
  gridEl.innerHTML = seats.map(adminSeatHtml).join("");
}

function closeEdit() {
  mode = null;
  selectedSeatId = null;
  hideNotice(editNoticeEl);
  editBarEl.hidden = true;
}

function openEdit(seat) {
  mode = "edit";
  selectedSeatId = seat.id;
  labelEl.value = seat.label;
  rowEl.value = seat.row;
  colEl.value = seat.col;
  capEl.value = seat.capacity;
  deleteBtn.hidden = false;
  hideNotice(editNoticeEl);
  editBarEl.hidden = false;
  renderGrid();
}

function openCreate() {
  const floor = activeFloor();
  if (!floor) return;
  const seats = floorSeats();
  const usedLabels = new Set(seats.map((s) => s.label));
  let n = 1;
  while (usedLabels.has(`T${n}`)) n++;

  const occupied = new Set(seats.map((s) => `${s.row}:${s.col}`));
  const maxCol = seats.length ? Math.max(...seats.map((s) => s.col)) : 5;
  let spot = null;
  for (let r = 1; r <= 50 && !spot; r++) {
    for (let c = 1; c <= maxCol; c++) {
      if (!occupied.has(`${r}:${c}`)) {
        spot = { r, c };
        break;
      }
    }
  }

  mode = "create";
  selectedSeatId = null;
  labelEl.value = `T${n}`;
  rowEl.value = spot ? spot.r : 1;
  colEl.value = spot ? spot.c : 1;
  capEl.value = 4;
  deleteBtn.hidden = true;
  hideNotice(editNoticeEl);
  editBarEl.hidden = false;
  renderGrid();
}

async function loadRestaurants() {
  try {
    const res = await fetch("/api/restaurants");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    restaurants = await res.json();
  } catch (err) {
    showNotice(topNoticeEl, "Couldn’t load restaurants. Refresh to try again.");
    return;
  }
  restaurantEl.innerHTML = restaurants
    .map((r) => `<option value="${r.id}">${r.name}</option>`)
    .join("");
  restaurantId = restaurants.length ? restaurants[0].id : null;
  restaurantEl.value = restaurantId;
  await loadRestaurant();
}

async function loadRestaurant() {
  if (!restaurantId) return;
  try {
    const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    details = await res.json();
  } catch (err) {
    showNotice(topNoticeEl, "Couldn’t load this restaurant. Refresh to try again.");
    return;
  }
  hideNotice(topNoticeEl);
  if (!details.floors.some((f) => f.id === activeFloorId)) {
    activeFloorId = details.floors.length ? details.floors[0].id : null;
  }
  closeEdit();
  sublineEl.textContent =
    `${details.restaurant.name} · ` +
    `${details.floors.length} ${details.floors.length === 1 ? "floor" : "floors"} · ` +
    `${details.seats.length} tables`;
  renderTabs();
  renderGrid();
}

restaurantEl.addEventListener("change", () => {
  restaurantId = Number(restaurantEl.value);
  activeFloorId = null;
  loadRestaurant();
});

tabsEl.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  activeFloorId = Number(tab.dataset.id);
  closeEdit();
  renderTabs();
  renderGrid();
});

gridEl.addEventListener("click", (e) => {
  const seatEl = e.target.closest("button.seat");
  if (!seatEl) return;
  const seat = details.seats.find((s) => s.id === Number(seatEl.dataset.id));
  if (seat) openEdit(seat);
});

addSeatBtn.addEventListener("click", openCreate);

addFloorBtn.addEventListener("click", async () => {
  const name = floorNameEl.value.trim();
  if (!name) return showNotice(topNoticeEl, "Enter a name for the new floor.");
  if (!restaurantId) return;
  try {
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/floors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return showNotice(topNoticeEl, data.error || "Couldn’t add the floor.");
    activeFloorId = data.floor.id;
    floorNameEl.value = "";
    await loadRestaurant();
  } catch (err) {
    showNotice(topNoticeEl, "Couldn’t reach the server. Try again.");
  }
});

saveBtn.addEventListener("click", async () => {
  if (!mode) return;
  const body = {
    label: labelEl.value.trim(),
    row: Number(rowEl.value),
    col: Number(colEl.value),
    capacity: Number(capEl.value),
  };
  if (!body.label) return showNotice(editNoticeEl, "Label can’t be empty.");
  for (const [field, value] of [["row", body.row], ["col", body.col], ["capacity", body.capacity]]) {
    if (!Number.isInteger(value)) {
      return showNotice(editNoticeEl, `${field} must be a whole number.`);
    }
  }

  const url =
    mode === "edit"
      ? `/api/admin/seats/${selectedSeatId}`
      : `/api/admin/floors/${activeFloorId}/seats`;
  const method = mode === "edit" ? "PATCH" : "POST";
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return showNotice(editNoticeEl, data.error || "Couldn’t save the table.");
    await loadRestaurant();
  } catch (err) {
    showNotice(editNoticeEl, "Couldn’t reach the server. Try again.");
  }
});

deleteBtn.addEventListener("click", async () => {
  if (mode !== "edit" || selectedSeatId === null) return;
  const floor = activeFloor();
  const seat = details.seats.find((s) => s.id === selectedSeatId);
  const ok = window.confirm(
    `Delete table ${seat.label} on the ${floor.name} floor? This cannot be undone.`
  );
  if (!ok) return;
  try {
    const res = await fetch(`/api/admin/seats/${selectedSeatId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 404) {
      return showNotice(editNoticeEl, data.error || "Couldn’t delete the table.");
    }
    await loadRestaurant();
  } catch (err) {
    showNotice(editNoticeEl, "Couldn’t reach the server. Try again.");
  }
});

window.revresAuth.then((user) => {
  if (!user || !user.is_admin) {
    sublineEl.textContent =
      "Admins only. Sign in with the admin account to edit floors, tables, and seating.";
    document.getElementById("canvas").classList.add("auth-page");
    document.getElementById("forbidden").hidden = false;
    return;
  }
  document.getElementById("admin-controls").hidden = false;
  document.getElementById("admin-ui").hidden = false;
  loadRestaurants();
});
