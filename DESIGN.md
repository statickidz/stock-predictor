---
name: Stock Predictor
description: A precise workspace for daily market research.
colors:
  primary: "#b74629"
  canvas: "#f8f7f4"
  surface: "#ffffff"
  control-surface: "#f0f0e9"
  ink: "#262b29"
  muted: "#62695f"
  line: "#e5e6df"
  observed: "#4d6657"
  projected: "#bf5a35"
typography:
  headline:
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif'
    fontSize: "28px"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-1.1px"
  title:
    fontSize: "17px"
    fontWeight: 550
  body:
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif'
    fontSize: "13px"
    lineHeight: 1.6
rounded:
  control: "6px"
  panel: "12px"
spacing:
  compact: "8px"
  group: "12px"
  panel-gap: "22px"
  chart-inset: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  chart-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

# Design System: Stock Predictor

## Overview

**Creative North Star: "A precise financial workspace"**

Approved visual direction: a restrained financial workspace for inspecting daily prices and model forecasts. Mode: Operate. A viewport-height desktop workspace with the chart on the left and forecast sidebar on the right. Narrow screens stack controls above analysis.

- Warm white canvas `#f8f7f4`, white chart surface, white forecast composer with neutral segmented controls, charcoal `#262b29`, orange primary action `#b74629`.
- A single system sans family, tabular price numerals, clear labels and fixed type sizes. No display typography or decorative animation.
- Observed prices use a solid muted green line; projections use a dashed orange line with a dated divider. Never imply a calibrated confidence interval.
- Forms use native buttons and inputs, visible focus, accessible names, 16px mobile inputs and 44px-class mobile touch targets.
- Above 900px, the desktop shell fills the window beneath a 64px header. A 320px right sidebar keeps its run action visible while settings scroll independently. The analysis column scrolls for results and expanded explanations. Below 901px, sections stack in normal document flow.
- Status, errors, provenance and dates are functional content. Real history loads first; forecast remains empty until genuine inference succeeds.

## Colors

The frontmatter records the shipped palette. Muted text is `#62695f`; secondary text on the form uses `#5c6753`. The composer surface is white, search uses the canvas tone, and selected assets use `#edf0e8`. Accent marks actions, observed prices are solid green, and projected prices are dashed orange. Color does not imply model confidence.

## Typography

One sans family carries headings and controls. Prices use tabular numerals. The headline uses 28px on desktop and 26px below 600px. Mobile search inputs use 16px.

## Layout

The right sidebar separates its heading, scrollable settings, and persistent execution area. Asset browsing is bounded to 108px on desktop. Storage uses a native disclosure; CPU/GPU selection uses a compact labeled row in the sidebar. The chart flexes to available height with a 240px minimum drawing area; the analysis column scrolls when the window is too short. Desktop page insets are 28px; phones use 16px. The sidebar uses the olive-neutral control surface.

## Elevation & Depth

Fine borders and tonal surfaces establish depth. The chart tooltip alone uses `0 3px 12px #2630220c`.

## Shapes

Panels use 12px corners and primary buttons/search fields 6px corners. Mobile interactive controls have at least 44px height; range buttons also have 44px minimum width.

## Components

Primary actions use orange, white text and a darker hover. Secondary actions use a fine border on white. Visible focus uses a 2px accent outline with 4px offset. Asset selection shows the symbol and name. The chart supports keyboard inspection; its table and CSV expose exact forecast values. Reduced-motion settings disable transitions and the loading animation.

Model selection uses a native select with the existing white control surface, fine border, 6px corners and visible focus. It has at least 44px height and uses 16px text on mobile. Model identity is repeated with the forecast and included in CSV export.

## Do's and Don'ts

- Do keep observation dates and model provenance visible.
- Do distinguish observed and projected values with line treatment as well as color.
- Do preserve keyboard focus and mobile touch targets.
- Don't label daily closes as live quotes.
- Don't present an estimated path as a calibrated confidence interval.

## System appearance and remembered settings

System light/dark preference controls appearance through `prefers-color-scheme`, including native controls, chart strokes, tooltips and browser theme color. Dark tokens use neutral charcoal canvas `#111214`, surface `#1b1d21`, ink `#eeeef0`, muted `#a8abb3`, line `#32343a` and focus/link accent `#9bb9ff`. Dark primary actions use blue `#426bdb` with white text. The dedicated navbar appearance icon toggles Light and Dark directly; an explicit choice is saved under `stock-predictor.theme`, applied in the document head before paint, and overrides system appearance. Light is the default when no valid choice is saved, including when browser storage is unavailable.

Browser localStorage key `stock-predictor.preferences.v1` remembers the market, published asset symbol, horizon, model, runtime, chart range and expanded disclosures. Startup validates choices against allowed values and available catalog entries; unsupported WebGPU falls back to CPU. Malformed or blocked storage does not prevent use. Imported files and generated forecasts are not stored as preferences.

## Application navbar and help

The navbar links to the project repository (`statickidz/stock-predictor`), with About and How it works actions in the Help popover opening native modal dialogs. Native focus containment, Escape dismissal, explicit Close buttons and focus restoration preserve keyboard access. The uncertainty explanation and research disclaimer live in these dialogs; the analysis canvas holds only chart and results. Appearance is a direct sun/moon toggle, while CPU/GPU is available directly in the sidebar at every width. Navigation stays in one row, with icon buttons on phones. CPU remains the default and GPU is disabled when WebGPU is unavailable. User-selected runtime is remembered.

## Refined navigation and volume

The 64px app bar places Help, an icon-only sun/moon appearance control, and project GitHub beside the wordmark. Labels become accessible icon buttons on phones. A native popover holds help actions; Escape and outside click dismiss them. Help opens native dialogs and focus returns to the visible Help button. There is no automatic entrance motion. Hover is pointer-gated; press feedback is subtle and reduced-motion disables transitions.

The asset badge displays the complete symbol, including crypto suffixes. A shared-date volume pane sits below prices: filled observed bars and outlined projected bars, with exact values in keyboard/pointer tooltips and the results table/CSV. Volume is the averaged decoder volume channel, separately denormalized; physically invalid negative estimates are clamped to zero and non-finite output is rejected. Volume uses the units supplied by the source snapshot. These estimates are not calibrated intervals.

## Chart inspection

A dashed vertical crosshair spans price and volume at the selected candle, with a point marker on its closing price. The tooltip follows that point, flips sides near the right edge and stays within an 8px chart inset. Touch positioning keeps it above the finger. Hover and keyboard updates are immediate, with no easing.

Touch users tap or drag horizontally to inspect; the last selection remains visible after release and dismisses on an outside tap. Native vertical panning and pinch zoom remain enabled (`touch-action: pan-y pinch-zoom`); a scroll cancellation clears the selection. Keyboard users inspect with arrows and Home/End, dismiss with Escape or focus loss, and receive date/price/volume announcements without pointer-driven live-region updates. Range/data changes and resizing reset inspection. Verified with browser touch emulation at 320px and 390px; physical-device testing remains separate.

## Compact forecast controls

Desktop market buttons are 32px tall. Horizon uses an inline label with 34px choices, model selection uses 38px, and the CPU/GPU row uses 36px. Desktop omits the introductory sentence and visually hides the explicit search label (which remains associated with the input), keeping Compute visible at 1366×768. Shorter desktop windows scroll the controls while Generate stays visible. Below 901px, these compact selectors return to 44px touch targets and the introduction/search label remain visible. Saved runtime selection behavior is unchanged.

## Workspace heading and disclaimer

The separate introductory row above the chart is removed. Its headline is a small secondary heading in the desktop navbar; below 901px it remains available to assistive technology without occupying space. The workspace begins directly below the header. Help includes a dedicated Disclaimer dialog covering research-only use, forecast uncertainty, snapshot freshness and investment risk. It shares native dialog dismissal and focus restoration with About and How it works.

## Distilled sidebar

The sidebar heading is simply Forecast, without an introductory sentence. Asset rows show symbol and name, with selection state, rather than repeated initial icons. Market counts are omitted visually but remain accessible. Model choices show their names and parameter counts, while download size and Base memory guidance stay below the select. Context/sample methodology remains in Help.

The compute field is labeled Run in this browser, with full-width WebAssembly · CPU and WebGPU · GPU options and a concise dynamic browser-capability description. When navigator.gpu is absent, WebGPU is disabled and marked unavailable; the description directs users to CPU. When exposed, the text offers WebGPU without promising device/model compatibility, and the GPU selection includes CPU recovery guidance. Runtime values and saved choices are unchanged. Local data/storage remains progressively disclosed; Generate stays visible.

## Sidebar terminology

Persistent labels use Search assets, Days ahead, Forecast model and Run forecast on. Search supplies an example name/ticker; the asset label remains visible at desktop widths. Days ahead explains trading days for stocks/ETFs and calendar days for crypto, and describes the named group accessibly. Model help identifies download size as an initial download. Runtime retains the explicit WebAssembly · CPU and WebGPU · GPU terms, with browser availability and CPU recovery guidance. Initial status explains that a model loads on the first forecast; completed status identifies the processor used by the last forecast rather than implying the current selection is loaded.

Import & model storage explains input requirements before the picker (64+ daily rows with date/OHLC/volume, 20 future dates, up to 2 MB), says files stay on-device, and names model-removal/redownload consequences. Underlying selections, storage keys and forecast behavior are unchanged.

## Direct appearance toggle

The sun/moon navbar button toggles light and dark with one activation; it has the stable accessible name Dark mode, an aria-pressed state and an action-specific title. There is no appearance menu. Mouse, touch, Enter and Space use the native button behavior. The theme choice persists across visits; fresh visits still default light. Previously saved System choices remain honored until the user toggles to an explicit light/dark preference.

## Navbar brand description

The descriptive headline, Price & volume forecasts powered by Kronos, sits below the logo inside a vertical brand lockup at every width. It uses 11px text and wraps on narrow screens while the header remains 64px.

## Restored reference sidebar arrangement

The user-selected reference restores Build a forecast with its introductory sentence, visible market counts, and a single-column asset list with initial icons, names and selection checks. Forecast horizon is labeled above its full-width button row. Model and processor controls stack vertically with separated groups and full-width selects; model parameters and browser-capability guidance remain. The asset list adapts between 112px and 208px on desktop and is bounded to 208px on smaller layouts. These choices supersede the earlier two-column list and inline horizon compaction.

Generate and its status remain in a persistent desktop footer, with Import & model storage beneath them as in the reference. Expanded storage scrolls within a bounded area in short desktop windows. The main settings scroll independently; mobile uses natural document flow. The current navbar, theme toggle, charts, predictions and saved selections remain in place.

## Navbar storage settings (current)

History import has been removed from the product, including its input, validation path and import-specific help. Earlier import/disclosure arrangements above are superseded. The sidebar ends with Generate and job status. A separate Settings icon in the navbar opens a native popover containing Remove downloaded models, redownload consequences, and an inline live status for success or failure. It clears only the model cache, preserves saved selections, and retains the existing forecast cancellation behavior. The action is disabled while deletion is pending.

## Compact sidebar heading and attribution

The sidebar heading keeps Build a forecast in a compact 14px/12px padded area, without an introductory sentence. Model/processor status sits in the Generate section, above the job message. Kronos in the navbar description links to its upstream GitHub repository in a new tab with noopener/noreferrer. Chart history defaults to 3M for new/invalid preferences while preserving a valid previously chosen range.
