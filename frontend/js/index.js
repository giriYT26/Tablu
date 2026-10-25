const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const sublineEl = document.getElementById("subline");
const searchEl = document.getElementById("search");
const locBtnEl = document.getElementById("loc-btn");
const locLabelEl = document.getElementById("loc-label");
const locNoticeEl = document.getElementById("loc-notice");

let total = null;
let userLocation = null;
let locating = false;

function floorplanSvg(rows, cols) {
  const dot = 3;
  const pitch = 6;
  const w = cols * pitch - (pitch - dot);
  const h = rows * pitch - (pitch - dot);
  let circles = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      circles += `<circle cx="${c * pitch + dot / 2}" cy="${r * pitch + dot / 2}" r="1.4" fill="currentColor"/>`;
    }
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${circles}</svg>`;
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function rowHtml(r) {
  const meta = `${r.category} · ${r.floors} ${r.floors === 1 ? "floor" : "floors"} · ${r.tables} tables`;
  const dist =
    typeof r.distance_km === "number"
      ? `<span class="row-dist num">${formatDistance(r.distance_km)} away</span>`
      : "";
  return `
    <li>
      <a class="row" href="restaurant.html?id=${r.id}">
        <span class="grid-tile">${floorplanSvg(r.grid_rows, r.grid_cols)}</span>
        <span class="row-text">
          <span class="row-name">${r.name}</span>
          <span class="row-meta">${meta}</span>
        </span>
        ${dist}
        <svg class="row-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </li>`;
}

function setSubline(shown, query) {
  if (total === null) {
    sublineEl.textContent = "Loading places…";
  } else if (query) {
    sublineEl.textContent = `${shown} of ${total} match “${query}”`;
  } else if (userLocation) {
    sublineEl.textContent = `${total} non-veg places · nearest first`;
  } else {
    sublineEl.textContent = `${total} non-veg places in Chennai`;
  }
}

function showSkeleton() {
  emptyEl.hidden = true;
  listEl.innerHTML = Array.from({ length: 4 }, () => `
    <li>
      <div class="skeleton" aria-hidden="true">
        <div class="skeleton-tile"></div>
        <div class="skeleton-lines">
          <div class="skeleton-bar" style="width: 55%"></div>
          <div class="skeleton-bar"></div>
        </div>
      </div>
    </li>`).join("");
}

function showError() {
  listEl.innerHTML = "";
  emptyEl.hidden = false;
  emptyEl.innerHTML = `<span class="error-box">Couldn’t load restaurants.<button type="button" id="retry">Retry</button></span>`;
  document.getElementById("retry").addEventListener("click", () => load(searchEl.value.trim()));
}

function showEmpty(query) {
  listEl.innerHTML = "";
  emptyEl.hidden = false;
  emptyEl.innerHTML = `<span class="empty-box">No restaurants match “${query}”.</span>`;
}

function listUrl(query) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (userLocation) {
    params.set("lat", userLocation.lat);
    params.set("lng", userLocation.lng);
  }
  const qs = params.toString();
  return qs ? `/api/restaurants?${qs}` : "/api/restaurants";
}

function setLocBtn(active) {
  locBtnEl.classList.toggle("is-active", active);
  locBtnEl.setAttribute("aria-pressed", String(active));
  locLabelEl.textContent = active ? "Near you" : "Use my location";
}

function showLocNotice(message) {
  locNoticeEl.innerHTML = "";
  locNoticeEl.append(`${message} `);
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Try again";
  retry.addEventListener("click", locate);
  locNoticeEl.append(retry);
  locNoticeEl.hidden = false;
}

function hideLocNotice() {
  locNoticeEl.hidden = true;
}

function locate() {
  if (locating) return;
  if (!navigator.geolocation) {
    showLocNotice("Location isn’t available in this browser. Showing all restaurants.");
    return;
  }
  locating = true;
  locBtnEl.disabled = true;
  locLabelEl.textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating = false;
      locBtnEl.disabled = false;
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      hideLocNotice();
      setLocBtn(true);
      load(searchEl.value.trim());
    },
    (err) => {
      locating = false;
      locBtnEl.disabled = false;
      setLocBtn(userLocation !== null);
      showLocNotice(
        err.code === 1
          ? "Location permission denied. Showing all restaurants."
          : "Couldn’t get your location. Showing all restaurants."
      );
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

async function load(query) {
  showSkeleton();
  setSubline(null, query);
  try {
    const res = await fetch(listUrl(query));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!query) total = data.length;

    if (data.length === 0) {
      showEmpty(query);
    } else {
      emptyEl.hidden = true;
      listEl.innerHTML = data.map(rowHtml).join("");
    }
    setSubline(data.length, query);
  } catch (err) {
    showError();
  }
}

let debounce;
searchEl.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => load(searchEl.value.trim()), 200);
});

locBtnEl.addEventListener("click", () => {
  if (userLocation) {
    userLocation = null;
    setLocBtn(false);
    load(searchEl.value.trim());
  } else {
    locate();
  }
});

setLocBtn(false);
load("");

const heroTrackEl = document.getElementById("hero-track");
const heroStageEl = document.getElementById("hero-stage");

if (heroTrackEl && heroStageEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  const scrub = () => {
    ticking = false;
    const travel = heroTrackEl.offsetHeight - heroStageEl.offsetHeight;
    const scrolled = -heroTrackEl.getBoundingClientRect().top;
    const p = travel > 0 ? Math.min(1, Math.max(0, scrolled / travel)) : 0;
    heroStageEl.style.setProperty("--p", p.toFixed(4));
  };
  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(scrub);
    }
  };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  scrub();
}
