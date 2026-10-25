const sublineEl = document.getElementById("subline");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");

let bookings = [];

function setSubline(n) {
  if (n === 0) sublineEl.textContent = "No bookings yet";
  else sublineEl.textContent = `${n} ${n === 1 ? "booking" : "bookings"}`;
}

function rowHtml(b) {
  const meta =
    `${b.floor_name} · ${b.table_label} · ` +
    `${b.capacity} ${b.capacity === 1 ? "seat" : "seats"}`;
  const when = `${b.restaurant_name} on ${b.date} at ${b.time_slot}`;
  return (
    `<li><div class="row">` +
    `<span class="row-text">` +
    `<span class="row-name">${b.restaurant_name}</span>` +
    `<span class="row-meta">${meta}</span>` +
    `</span>` +
    `<span class="row-when">` +
    `<span class="when-date num">${b.date}</span>` +
    `<span class="when-time num">${b.time_slot}</span>` +
    `</span>` +
    `<button class="btn-ghost" type="button" data-id="${b.id}" ` +
    `aria-label="Cancel booking at ${when}">Cancel</button>` +
    `</div></li>`
  );
}

function showSkeleton() {
  listEl.hidden = false;
  listEl.innerHTML = Array.from({ length: 3 }, () =>
    `<li><div class="row">` +
    `<span class="skeleton-tile" aria-hidden="true"></span>` +
    `<span class="skeleton-lines">` +
    `<span class="skeleton-bar" aria-hidden="true"></span>` +
    `<span class="skeleton-bar" aria-hidden="true"></span>` +
    `</span></div></li>`
  ).join("");
  emptyEl.hidden = true;
}

function showError() {
  listEl.hidden = true;
  emptyEl.hidden = false;
  setSubline(0);
  emptyEl.innerHTML =
    `<span class="error-box">Couldn’t load bookings.` +
    `<button type="button" id="retry">Retry</button></span>`;
  document.getElementById("retry").addEventListener("click", load);
}

async function load() {
  showSkeleton();
  try {
    const res = await fetch("/api/bookings");
    if (res.status === 401) {
      window.location.replace(
        `login.html?next=${encodeURIComponent("bookings.html")}`
      );
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bookings = await res.json();
    setSubline(bookings.length);
    if (bookings.length === 0) {
      listEl.hidden = true;
      emptyEl.hidden = false;
      emptyEl.innerHTML =
        `<span class="empty-box">No bookings yet. ` +
        `<a href="/">Browse restaurants</a></span>`;
      return;
    }
    emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = bookings.map(rowHtml).join("");
  } catch (err) {
    showError();
  }
}

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-ghost");
  if (!btn) return;
  const booking = bookings.find((b) => b.id === Number(btn.dataset.id));
  if (!booking) return;
  const ok = window.confirm(
    `Cancel your table at ${booking.restaurant_name} ` +
    `(${booking.floor_name} ${booking.table_label}) ` +
    `on ${booking.date} at ${booking.time_slot}?`
  );
  if (!ok) return;
  btn.disabled = true;
  try {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "DELETE",
    });
    if (res.status === 401) {
      window.location.replace(
        `login.html?next=${encodeURIComponent("bookings.html")}`
      );
      return;
    }
    if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    showError();
    return;
  }
  load();
});

load();
