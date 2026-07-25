import { icon } from "./icons.js";
import { COLOR_THEMES, applyColorTheme, applyMode, getStoredColorTheme, getStoredMode, initTheme } from "./theme.js";
import { getCurrentPosition, getManualLocation, setManualLocation, distanceKm, bearingDeg } from "./geo.js";
import { requestCompassPermission, startCompass, isCompassSupported } from "./compass.js";
import { fetchNearbyAircraft } from "./api.js";
import { initFavourites, listFavourites, addFavourite, removeFavourite } from "./favourites.js";
import {
  hydrateIcons,
  openModal,
  closeModal,
  showToast,
  renderAircraftCard,
  renderFavouriteCard,
  emptyState,
} from "./ui.js";

const SEARCH_RADIUS_KM = 80;
const AUTO_REFRESH_MS = 20000;
const RADAR_MAX_RANGE_KM = 100;

const state = {
  location: null,
  aircraft: [],
  favFlights: [],
  favAircraft: [],
  heading: 0,
  compassActive: false,
  activeTab: "radar",
  loading: false,
};

/* ---------------------------------- boot --------------------------------- */

async function boot() {
  initTheme();
  hydrateIcons();
  buildThemeModal();
  wireHeader();
  wireTabs();
  wireModals();
  wireLocationForm();
  wireCompassButton();
  wireListDelegation();

  await initFavourites();
  await refreshFavourites();

  await resolveLocation();
  scheduleAutoRefresh();
}

/* --------------------------------- theme UI ------------------------------- */

function buildThemeModal() {
  const grid = document.getElementById("swatchGrid");
  grid.innerHTML = COLOR_THEMES.map(
    (t) => `
      <button class="swatch" data-theme-id="${t.id}" style="--swatch-color:${t.hex}" type="button" aria-label="${t.label}">
        <span class="swatch-dot"></span>
        <span class="swatch-label">${t.label}</span>
      </button>`
  ).join("");

  syncThemeModalState();

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-id]");
    if (!btn) return;
    applyColorTheme(btn.dataset.themeId);
    syncThemeModalState();
  });

  document.getElementById("modeToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    applyMode(btn.dataset.mode);
    syncThemeModalState();
  });
}

function syncThemeModalState() {
  const activeTheme = getStoredColorTheme();
  const activeMode = getStoredMode();
  document.querySelectorAll("#swatchGrid .swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.themeId === activeTheme);
  });
  document.querySelectorAll("#modeToggle .mode-btn").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === activeMode);
  });
}

function wireHeader() {
  document.getElementById("themeBtn").addEventListener("click", () => openModal("themeModal"));
}

/* ---------------------------------- tabs ---------------------------------- */

function wireTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });
}

function setActiveTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll(".tab").forEach((t) => {
    const active = t.dataset.tab === tabId;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".panel").forEach((p) => {
    const active = p.id === `panel-${tabId}`;
    p.classList.toggle("active", active);
    p.hidden = !active;
  });
}

/* --------------------------------- modals --------------------------------- */

function wireModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });
  document.getElementById("manualLocationBtn").addEventListener("click", () => {
    const loc = state.location;
    if (loc) {
      document.getElementById("manualLat").value = loc.lat.toFixed(5);
      document.getElementById("manualLon").value = loc.lon.toFixed(5);
    }
    openModal("locationModal");
  });
}

function wireLocationForm() {
  document.getElementById("locationForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const lat = parseFloat(document.getElementById("manualLat").value);
    const lon = parseFloat(document.getElementById("manualLon").value);
    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      showToast("Enter a valid latitude and longitude.", "error");
      return;
    }
    setManualLocation(lat, lon);
    state.location = { lat, lon, manual: true };
    closeModal("locationModal");
    setStatus(`Using manual location (${lat.toFixed(2)}, ${lon.toFixed(2)}).`, "ok");
    loadAircraft();
  });

  document.getElementById("useGpsBtn").addEventListener("click", async () => {
    closeModal("locationModal");
    await resolveLocation(true);
  });

  document.getElementById("refreshBtn").addEventListener("click", () => loadAircraft());
}

/* ------------------------------- location --------------------------------- */

async function resolveLocation(forceGps = false) {
  setStatus("Locating you…", "busy");
  try {
    const pos = await getCurrentPosition();
    state.location = pos;
    setStatus(`Located within ${Math.round(pos.accuracy || 0)} m.`, "ok");
    await loadAircraft();
    return;
  } catch (err) {
    if (!forceGps) {
      const manual = getManualLocation();
      if (manual) {
        state.location = manual;
        setStatus("Using your saved manual location.", "ok");
        await loadAircraft();
        return;
      }
    }
    setStatus(err.message + " Set a location manually to continue.", "warn");
    showToast(err.message, "error");
  }
}

function setStatus(text, tone) {
  document.getElementById("statusText").textContent = text;
  document.getElementById("statusDot").dataset.tone = tone;
}

/* -------------------------------- aircraft --------------------------------- */

async function loadAircraft() {
  if (!state.location || state.loading) return;
  state.loading = true;
  const { lat, lon } = state.location;

  try {
    const result = await fetchNearbyAircraft(lat, lon, SEARCH_RADIUS_KM);
    if (!result.success && !result.aircraft?.length) {
      setStatus(result.error || "Could not load aircraft.", "warn");
    } else if (result.stale) {
      setStatus(result.error || "Showing cached data.", "warn");
    } else {
      setStatus(`Updated just now, ${result.aircraft.length} aircraft nearby.`, "ok");
    }

    state.aircraft = (result.aircraft || []).map((ac) => ({
      ...ac,
      distanceKm: distanceKm(lat, lon, ac.lat, ac.lon),
      bearing: bearingDeg(lat, lon, ac.lat, ac.lon),
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    document.getElementById("sourceBadge").textContent = result.source ? `Source: ${result.source}` : "";
    renderList();
    renderRadar();
  } catch (err) {
    setStatus(err.message, "warn");
    showToast(err.message, "error");
  } finally {
    state.loading = false;
  }
}

function scheduleAutoRefresh() {
  setInterval(() => {
    if (document.hidden || !state.location) return;
    loadAircraft();
  }, AUTO_REFRESH_MS);
}

/* ---------------------------------- list ----------------------------------- */

function renderList() {
  const container = document.getElementById("nearbyList");
  document.getElementById("resultCount").textContent = `${state.aircraft.length} aircraft nearby`;

  if (!state.aircraft.length) {
    container.innerHTML = emptyState("No aircraft detected in range right now.");
    return;
  }
  container.innerHTML = state.aircraft
    .map((ac) => renderAircraftCard(ac, { isFav: isFavFlight(ac.callsign) }))
    .join("");

  document.getElementById("radarList").innerHTML = container.innerHTML;
}

function isFavFlight(callsign) {
  return !!callsign && state.favFlights.some((f) => f.value === callsign);
}

function isFavAircraftType(type) {
  return !!type && state.favAircraft.some((f) => f.value === type);
}

/* ---------------------------------- radar ----------------------------------- */

function renderRadar() {
  const markersEl = document.getElementById("radarMarkers");
  const ring = document.getElementById("radarRing");
  const ringSize = ring.clientWidth || 260;
  const radius = ringSize / 2 - 14;

  markersEl.innerHTML = state.aircraft
    .filter((ac) => ac.distanceKm <= RADAR_MAX_RANGE_KM)
    .map((ac) => {
      const r = Math.max(10, (ac.distanceKm / RADAR_MAX_RANGE_KM) * radius);
      const angleRad = ((ac.bearing - 90) * Math.PI) / 180;
      const x = Math.cos(angleRad) * r;
      const y = Math.sin(angleRad) * r;
      return `<button class="radar-marker" style="transform: translate(${x}px, ${y}px) rotate(${ac.bearing}deg);" data-action="detail" data-id="${ac.id}" title="${ac.callsign || ac.type || "Aircraft"}">${icon("compassArrow")}</button>`;
    })
    .join("");

  document.getElementById("radarHint").textContent = state.compassActive
    ? "Ring rotates with your phone; arrows point toward each aircraft."
    : "Showing true bearings (N up). Enable compass to align with where you're facing.";
}

function applyCompassRotation() {
  const ring = document.getElementById("radarMarkers");
  ring.style.transform = `rotate(${-state.heading}deg)`;
}

function wireCompassButton() {
  document.getElementById("compassBtn").addEventListener("click", async () => {
    if (!isCompassSupported()) {
      showToast("Compass isn't supported on this device.", "error");
      return;
    }
    const granted = await requestCompassPermission();
    if (!granted) {
      showToast("Compass permission was denied.", "error");
      return;
    }
    state.compassActive = true;
    document.getElementById("compassBtn").textContent = "Compass active";
    startCompass((heading) => {
      state.heading = heading;
      applyCompassRotation();
    });
    renderRadar();
  });
}

/* ------------------------------- favourites --------------------------------- */

async function refreshFavourites() {
  state.favFlights = await listFavourites("flight");
  state.favAircraft = await listFavourites("aircraft");
  renderFavourites();
}

function renderFavourites() {
  const flightsEl = document.getElementById("favFlights");
  const typesEl = document.getElementById("favAircraft");
  flightsEl.innerHTML = state.favFlights.length
    ? state.favFlights.map((f) => renderFavouriteCard(f, "flight")).join("")
    : emptyState("No favourite flights yet. Star one from the Radar or Nearby tab.");
  typesEl.innerHTML = state.favAircraft.length
    ? state.favAircraft.map((f) => renderFavouriteCard(f, "aircraft")).join("")
    : emptyState("No favourite aircraft types yet.");
}

/* ------------------------------ delegated clicks ----------------------------- */

function wireListDelegation() {
  document.body.addEventListener("click", async (e) => {
    const favBtn = e.target.closest("[data-action='fav-flight']");
    if (favBtn) {
      const ac = state.aircraft.find((a) => a.id === favBtn.dataset.id);
      if (!ac || !ac.callsign) {
        showToast("This aircraft has no callsign to favourite yet.", "error");
        return;
      }
      if (isFavFlight(ac.callsign)) {
        const fav = state.favFlights.find((f) => f.value === ac.callsign);
        if (fav) await removeFavourite(fav.id);
        showToast(`Removed ${ac.callsign} from favourites.`);
      } else {
        await addFavourite("flight", ac.callsign, ac.callsign);
        showToast(`Added ${ac.callsign} to favourites.`);
      }
      await refreshFavourites();
      renderList();
      return;
    }

    const removeBtn = e.target.closest("[data-action='remove-fav']");
    if (removeBtn) {
      await removeFavourite(removeBtn.dataset.id);
      await refreshFavourites();
      renderList();
      return;
    }

    const detailBtn = e.target.closest("[data-action='detail']");
    if (detailBtn) {
      showDetail(detailBtn.dataset.id);
    }
  });
}

function showDetail(id) {
  const ac = state.aircraft.find((a) => a.id === id);
  if (!ac) return;
  document.getElementById("detailModalTitle").textContent = ac.callsign || ac.registration || "Aircraft";
  const rows = [
    ["Callsign", ac.callsign],
    ["Registration", ac.registration],
    ["Type", ac.type],
    ["Distance", `${ac.distanceKm?.toFixed(1)} km`],
    ["Bearing", `${Math.round(ac.bearing)}°`],
    ["Altitude", ac.altitude != null ? `${Math.round(ac.altitude * 3.28084).toLocaleString()} ft` : null],
    ["Ground speed", ac.speedKt != null ? `${Math.round(ac.speedKt)} kt` : null],
    ["Heading", ac.heading != null ? `${Math.round(ac.heading)}°` : null],
    ["Squawk", ac.squawk],
    ["Source", ac.source],
  ].filter(([, v]) => v);

  document.getElementById("detailBody").innerHTML = `
    <div class="detail-actions">
      <button class="btn" id="detailFavBtn">${isFavAircraftType(ac.type) ? "Remove aircraft type favourite" : "Favourite this aircraft type"}</button>
    </div>
    <dl class="detail-grid">
      ${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}
    </dl>`;

  const favTypeBtn = document.getElementById("detailFavBtn");
  favTypeBtn.addEventListener("click", async () => {
    if (!ac.type) {
      showToast("No aircraft type available for this contact.", "error");
      return;
    }
    if (isFavAircraftType(ac.type)) {
      const fav = state.favAircraft.find((f) => f.value === ac.type);
      if (fav) await removeFavourite(fav.id);
    } else {
      await addFavourite("aircraft", ac.type, ac.type);
    }
    await refreshFavourites();
    closeModal("detailModal");
  });

  openModal("detailModal");
}

boot();
