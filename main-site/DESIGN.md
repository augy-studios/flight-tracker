# uwuFlights: design system reference

This is a reference doc for prompting Claude Code (or anyone else) to make
changes that stay visually consistent with the existing site. It describes
the *system*, not just today's values, so update it whenever a token,
rule, or convention below actually changes in `style.css`.

## Core rules (don't break these)

- **No gradients, orbs, or blobs, anywhere.** Backgrounds are always a
  flat, static colour derived from the current theme
  (`color-mix(in srgb, var(--brand) 10%, var(--bg))` on `body`). If a
  change seems to call for a gradient or a soft background blob, use a
  flat tint or a glass card instead.
- **Glassmorphism, not flat cards.** Any card-like surface uses the
  `.glass` primitive (see below), not a plain solid background.
- **Font is Jua, everywhere.** Set once on `*` with a `sans-serif`
  fallback. Don't override `font-family` per component.
- **No emoji, ever.** All icons are inline SVG from `js/icons.js`. Add new
  icons there and reference them via `data-icon="name"` (hydrated by
  `hydrateIcons()` in `js/ui.js`), not as literal emoji characters or
  external icon fonts.
- **No em dashes.** Rephrase with a comma, semicolon, colon, or period
  instead, in code comments and docs as well as UI copy.
- **Light mode is the default**, not influenced by OS `prefers-color-scheme`
  on first load. Users opt into dark mode explicitly via the theme modal.

## Colour tokens

All colours are CSS custom properties on `:root`, split into two
independent axes that combine freely: **brand colour** (7 options) and
**mode** (light/dark). Never hardcode a hex value in a component's CSS;
reference the variable so it stays correct across all 14 combinations.

### Brand colour (`data-color-theme` on `<html>`)

| id | Label | `--brand` |
|---|---|---|
| `classic` (default) | Classic | `#ccffcc` |
| `not-green-1` | Not green 1 | `#ffcccc` |
| `not-green-2` | Not green 2 | `#ccccff` |
| `not-green-3` | Not green 3 | `#ffffcc` |
| `not-green-4` | Not green 4 | `#ffccff` |
| `not-green-5` | Not green 5 | `#ccffff` |
| `really-light-green` | Really really light green | `#ffffff` |

Each also sets `--brand-rgb` (the same colour as comma-separated `r, g, b`)
for use in `rgba()`/tint mixes. Defined and applied in `js/theme.js`
(`COLOR_THEMES`, `applyColorTheme()`).

### Mode (`data-mode` on `<html>`)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#eef2f0` | `#0c100e` | page background base (before brand tint) |
| `--surface` | `rgba(255,255,255,.55)` | `rgba(255,255,255,.06)` | `.glass` card background |
| `--surface-strong` | `rgba(255,255,255,.78)` | `rgba(255,255,255,.11)` | buttons, active tab, badges |
| `--surface-border` | `rgba(255,255,255,.65)` | `rgba(255,255,255,.14)` | `.glass` border, dividers |
| `--ink` | `#121815` | `#eef2ef` | primary text |
| `--muted` | `#5b665f` | `#9aa7a0` | secondary text |
| `--brand-ink` | `#1f6b3d` | `#bff5cf` | headings, links, active states (always readable against the brand tint, independent of which of the 7 brand colours is active) |
| `--shadow` | soft, low-opacity dark | deeper, higher-opacity black | `.glass` box-shadow |
| `--ok` | `#16a34a` | `#4ade80` | success status dot/text |
| `--warn` | `#b45309` | `#fbbf24` | warning status dot/text |
| `--busy` | `#64748b` | `#94a3b8` | in-progress status dot |
| `--error` | `#b91c1c` | `#f87171` | error text/toast |

One fixed exception: the footer's "Made with (heart) by Augy" heart is a
hardcoded green (`#34c759`, `.footer-heart`), not `--brand-ink`, so it
always reads as a heart regardless of the active brand colour.

## Glassmorphism primitive

```css
.glass {
  background: var(--surface);
  backdrop-filter: blur(18px) saturate(150%);
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  box-shadow: var(--shadow);
}
```

Applied to: header, status bar, tab bar, radar card, list toolbar, every
card in a card list, and modals. Smaller nested controls (buttons,
badges, chips) use `--surface-strong` directly instead of `.glass`, so
they read as a level "above" the card they sit on.

## Shape and spacing conventions

- Large surfaces (`.glass`): `border-radius: 20px`.
- Cards (`.ac-card`, `.fav-card`, `.modal`): `border-radius: 16-20px`.
- Buttons/chips: pill (`border-radius: 999px`) for small chip-style
  buttons, `12-14px` for rectangular buttons.
- Icon buttons are square-ish: `42px` standard, `34px` for `.small`.
- Base layout is a single centred column, `max-width: 720px`, `#app`
  padding `14px` (`10px` under the small-screen breakpoint).

## Toast

A single `#toast` element (`index.html`), shown via `showToast(message,
tone)` in `js/ui.js`. Notes:

- Pill-shaped (`border-radius: 999px`), fixed to the bottom centre of the
  screen, `z-index: 60` (above modals' `z-index: 50`).
- Visually glass-like but doesn't use the `.glass` class: it hand-rolls a
  similar look (`--surface-strong` background, `--surface-border`
  border, `backdrop-filter: blur(14px)`) with its own values rather than
  reusing the primitive, since it needs a pill shape instead of `.glass`'s
  `20px` radius.
- `tone` is an optional data attribute (`data-tone="error"` or `"ok"`)
  that recolours the message text via `--error`/`--ok`; omit it for a
  neutral/info message.
- Auto-dismisses after ~3.2s (`toastTimer` in `js/ui.js`); a second
  `showToast()` call before that resets the timer rather than stacking a
  second toast, since there's only ever one instance.
- Animation (fade + slight vertical slide on show/hide) is covered in
  Motion, below.

## Icons

- Defined in `js/icons.js` as an `icons` map of raw SVG strings, `viewBox
  "0 0 24 24"`, `stroke="currentColor"`, `stroke-width="1.8"`,
  `stroke-linecap`/`stroke-linejoin="round"`, `fill="none"` for outline
  icons.
- Filled variants (`starFilled`, `planeFilled`, `heartFilled`) use
  `fill="currentColor" stroke="none"` instead.
- Icons inherit colour via `currentColor`, so they follow whatever text
  colour their container sets; don't hardcode icon fill/stroke colours.
- Rendered into the DOM via `data-icon="name"` placeholders, hydrated by
  `hydrateIcons()` (`js/ui.js`), which is safe to call repeatedly (it
  no-ops if the icon already matches, and re-renders if `data-icon`
  changes, e.g. the theme button swapping between `sun`/`moon`).

## Responsive

Single breakpoint: `@media (max-width: 480px)`. Pattern used throughout:
flex children that could overflow get `min-width: 0` plus
`text-overflow: ellipsis` on their text node, fixed-size controls get
`flex-shrink: 0`, and containers that might get tight wrap
(`flex-wrap: wrap`) rather than clip. The coffee button collapses to
icon-only under the breakpoint rather than wrapping its label.

## Interaction conventions

- Clickable non-`<button>` elements (e.g. `.ac-card-main`, a `<div>` with a
  click handler) get an explicit `cursor: pointer`; real `<button>`
  elements already get this from the global `button { cursor: pointer; }`
  rule.
- Links don't show an underline on hover (`a:hover { text-decoration:
  none; }`); underline (if any) is a resting-state style only.
- Toggling a favourite/setting from a modal updates that control in place
  (e.g. relabels the button, refreshes underlying lists) rather than
  closing the modal; closing is a separate, explicit user action.

## Motion

Everything that opens, closes, or switches state animates; nothing pops in
or out instantly. Durations are short (150-220ms) so it reads as
responsive, not slow.

- **Modals** (`.modal-backdrop`/`.modal`): opening/closing is driven purely
  by JS toggling the existing `.hidden` class (`openModal`/`closeModal` in
  `js/ui.js`); no JS timing logic needed. CSS handles both directions:
  the backdrop fades (`opacity`, with `visibility` flipping after the
  fade so it's not interactive while hidden), and the modal itself
  scales/translates in (`translateY(14px) scale(0.97)` -> resting state).
- **Toast** (`#toast`): same pattern as modals, opacity + a small
  vertical slide, driven by the existing `.hidden` class toggle in
  `showToast()`.
- **Tab panels** (`.panel.active`): a one-shot `panel-in` keyframe
  (fade + slight upward slide) plays when a panel gains `.active`. Only
  the entrance animates; switching away is an instant `display: none`,
  which is fine since the user's attention has already moved to the tab
  they just picked.
- **Small state changes** (`.tab.active`, `.mode-btn.active`,
  `.swatch.active`, `.icon-btn:hover`) get a short `background`/`color`/
  `border-color`/`transform` transition instead of snapping.
- **Respect `prefers-reduced-motion: reduce`**: a global rule collapses
  all animation/transition durations to effectively instant for users who
  request it. Don't add a new animation without confirming it's covered
  by that rule (anything using `animation-duration`/`transition-duration`
  already is).
- When adding a new open/close-style UI element, follow the modal/toast
  pattern: keep the show/hide toggle a single class flip in JS, put the
  entrance and exit timing entirely in CSS via that class.
