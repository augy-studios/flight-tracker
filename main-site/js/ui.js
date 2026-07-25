// DOM rendering helpers shared across panels. Kept framework-free on purpose
// (small static PWA, no build step) but centralised so markup stays consistent.

import { icon } from "./icons.js";

export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.getAttribute("data-icon");
    if (el.dataset.hydrated === name) return;
    el.innerHTML = icon(name);
    el.dataset.hydrated = name;
  });
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  document.body.classList.add("modal-open");
  hydrateIcons(el);
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
  if (!document.querySelector(".modal-backdrop:not(.hidden)")) {
    document.body.classList.remove("modal-open");
  }
}

let toastTimer = null;
export function showToast(message, tone = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
}

export function fmtDistance(km) {
  if (km == null || Number.isNaN(km)) return "N/A";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function fmtAltitude(m) {
  if (m == null || Number.isNaN(m)) return "N/A";
  const ft = m * 3.28084;
  return `${Math.round(ft).toLocaleString()} ft`;
}

export function fmtSpeed(kt) {
  if (kt == null || Number.isNaN(kt)) return "N/A";
  return `${Math.round(kt)} kt`;
}

export function fmtBearing(deg) {
  if (deg == null || Number.isNaN(deg)) return "N/A";
  return `${Math.round(deg)}°`;
}

export function aircraftLabel(ac) {
  return ac.callsign || ac.registration || ac.type || ac.id || "Unknown aircraft";
}

export function renderAircraftCard(ac, { isFav = false, isFavType = false } = {}) {
  const label = aircraftLabel(ac);
  const sub = [ac.type, ac.registration].filter(Boolean).join(" · ");
  return `
    <article class="ac-card glass" data-id="${ac.id}">
      <div class="ac-card-main" data-action="detail" data-id="${ac.id}">
        <div class="ac-card-icon" style="transform:rotate(${(ac.heading ?? 0)}deg)" data-icon="planeFilled"></div>
        <div class="ac-card-text">
          <strong>${label}</strong>
          <span class="muted">${sub || "Unknown type"}</span>
        </div>
      </div>
      <div class="ac-card-stats">
        <span title="Distance">${fmtDistance(ac.distanceKm)}</span>
        <span title="Altitude">${fmtAltitude(ac.altitude)}</span>
        <span title="Ground speed">${fmtSpeed(ac.speedKt)}</span>
      </div>
      <button class="star-btn ${isFav ? "active" : ""}" data-action="fav-flight" data-id="${ac.id}" aria-label="Favourite this flight">
        <span data-icon="${isFav ? "starFilled" : "star"}"></span>
      </button>
    </article>`;
}

export function renderFavouriteCard(fav, kind) {
  return `
    <article class="fav-card glass" data-id="${fav.id}">
      <div class="fav-card-icon" data-icon="${kind === "flight" ? "planeFilled" : "planeFilled"}"></div>
      <div class="ac-card-text">
        <strong>${fav.label || fav.value}</strong>
        <span class="muted">${kind === "flight" ? "Flight" : "Aircraft type"} · ${fav.value}</span>
      </div>
      <button class="icon-btn small" data-action="remove-fav" data-id="${fav.id}" aria-label="Remove favourite">
        <span data-icon="trash"></span>
      </button>
    </article>`;
}

export function emptyState(message) {
  return `<div class="empty-state muted">${message}</div>`;
}
