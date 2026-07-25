// Inline SVG icon set - no emojis anywhere in the UI.
// Each function returns an SVG string sized via currentColor so it inherits button/text colour.

const svg = (inner, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const icons = {
  plane: svg(`<path d="M3 12.5 20 6l-2.4 4.6L21 14l-6.5-1L12 19l-1.4-6.3L3 12.5Z"/>`),

  planeFilled: svg(
    `<path d="M3 12.5 20 6l-2.4 4.6L21 14l-6.5-1L12 19l-1.4-6.3L3 12.5Z" fill="currentColor" stroke="none"/>`
  ),

  star: svg(`<path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9Z"/>`),

  starFilled: svg(
    `<path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9Z" fill="currentColor"/>`
  ),

  palette: svg(
    `<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h1.6c1.9 0 3.4-1.5 3.4-3.4A8.6 8.6 0 0 0 12 3Z"/><circle cx="7.3" cy="10.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="10.8" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.3" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="16.8" cy="12.2" r="1.1" fill="currentColor" stroke="none"/>`
  ),

  sun: svg(
    `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>`
  ),

  moon: svg(`<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>`),

  coffee: svg(
    `<path d="M4 9h13v5.5A4.5 4.5 0 0 1 12.5 19h-4A4.5 4.5 0 0 1 4 14.5V9Z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 4.5c0 1-.9 1.2-.9 2.2 0 .7.45 1 .45 1M11 4.5c0 1-.9 1.2-.9 2.2 0 .7.45 1 .45 1"/>`
  ),

  locate: svg(
    `<circle cx="12" cy="12" r="2.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>`
  ),

  refresh: svg(
    `<path d="M20 11a8 8 0 0 0-14.3-4.6M4 4v4.4h4.4"/><path d="M4 13a8 8 0 0 0 14.3 4.6M20 20v-4.4h-4.4"/>`
  ),

  warning: svg(
    `<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 9.5v4.2"/><circle cx="12" cy="17" r=".2" fill="currentColor"/>`
  ),

  wifiOff: svg(
    `<path d="M2.5 2.5l19 19"/><path d="M9.2 9.3a10 10 0 0 1 10.6 2.4M5.6 6.7A15 15 0 0 1 12 5c1.6 0 3.1.25 4.5.73M2.4 9.7A15 15 0 0 1 6 7.4M6.8 13a9.9 9.9 0 0 1 3.3-2"/><path d="M8.5 16.3a5 5 0 0 1 6.6-.4"/><circle cx="12" cy="19.3" r=".2" fill="currentColor"/>`
  ),

  close: svg(`<path d="M5 5l14 14M19 5 5 19"/>`),

  radar: svg(
    `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.4"/><circle cx="12" cy="12" r="1.8"/><path d="M12 12 19 7"/>`
  ),

  list: svg(
    `<path d="M8 6.5h13M8 12h13M8 17.5h13"/><circle cx="3.3" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="3.3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3.3" cy="17.5" r="1" fill="currentColor" stroke="none"/>`
  ),

  heart: svg(
    `<path d="M12 20.2 4.9 13a5 5 0 0 1 7.1-7l0 0a5 5 0 0 1 7.1 7L12 20.2Z"/>`
  ),

  heartFilled: svg(
    `<path d="M12 20.2 4.9 13a5 5 0 0 1 7.1-7l0 0a5 5 0 0 1 7.1 7L12 20.2Z" fill="currentColor" stroke="none"/>`
  ),

  compassArrow: svg(`<path d="M12 2.5 15 12l-3 9.5L9 12 12 2.5Z" fill="currentColor" stroke="none"/>`),

  gauge: svg(
    `<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15 16 9.5"/><circle cx="12" cy="15" r=".2" fill="currentColor"/>`
  ),

  altitude: svg(`<path d="M12 3.5 20 20H4L12 3.5Z"/><path d="M12 9 16 20M12 9l-4 11"/>`),

  chevronDown: svg(`<path d="M6 9l6 6 6-6"/>`),

  telegram: svg(
    `<path d="M21 4 3 11.2l5.4 1.9M21 4 18 20l-6.7-5.2M21 4 8.4 13.1v5.6l2.9-3.5"/>`
  ),

  trash: svg(
    `<path d="M4.5 7h15M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M18 7l-.8 12.1A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.9L6 7"/>`
  ),

  info: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".2" fill="currentColor"/>`),

  check: svg(`<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>`),
};

export function icon(name, className = "") {
  const markup = icons[name] || icons.info;
  return className ? markup.replace("<svg ", `<svg class="${className}" `) : markup;
}
