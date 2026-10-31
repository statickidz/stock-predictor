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
- Above 900px, the desktop shell fills the window beneath a 60px header. A 320px right sidebar keeps its run action visible while settings scroll independently. The analysis column scrolls for results and expanded explanations. Below 901px, sections stack in normal document flow.
- Status, errors, provenance and dates are functional content. Real history loads first; forecast remains empty until genuine inference succeeds.

## Colors

The frontmatter records the shipped palette. Muted text is `#62695f`; secondary text on the form uses `#5c6753`. The composer surface is white, search uses the canvas tone, and selected assets use `#edf0e8`. Accent marks actions, observed prices are solid green, and projected prices are dashed orange. Color does not imply model confidence.

## Typography

One sans family carries headings and controls. Prices use tabular numerals. The headline uses 28px on desktop and 26px below 600px. Mobile search inputs use 16px.

## Layout

The right sidebar separates its heading, scrollable settings, and persistent execution area. Asset browsing is bounded to 108px on desktop. Storage uses a native disclosure; CPU/GPU selection lives in the navbar. The chart flexes to available height with a 180px minimum drawing area; the analysis column scrolls when the window is too short. Desktop page insets are 28px; phones use 16px. The sidebar uses the olive-neutral control surface.

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

System light/dark preference controls appearance through `prefers-color-scheme`, including native controls, chart strokes, tooltips and browser theme color. Dark tokens use canvas `#171b19`, surface `#202622`, ink `#e8ece7`, muted `#aeb9ad`, line `#39423a` and focus/link accent `#ed9976`. The primary action retains orange `#b74629` with white text. The navbar offers System, Light and Dark; an explicit choice is saved under `stock-predictor.theme`, applied in the document head before paint, and overrides system appearance. System remains the default.

Browser localStorage key `stock-predictor.preferences.v1` remembers the market, published asset symbol, horizon, model, runtime, chart range and expanded disclosures. Startup validates choices against allowed values and available catalog entries; unsupported WebGPU falls back to CPU. Malformed or blocked storage does not prevent use. Imported files and generated forecasts are not stored as preferences.

## Application navbar and help

The navbar links to the project repository (`statickidz/stock-predictor`), with About and How it works buttons opening native modal dialogs. Native focus containment, Escape dismissal, explicit Close buttons and focus restoration preserve keyboard access. The uncertainty explanation and research disclaimer live in these dialogs; the analysis canvas holds only chart and results. Appearance and CPU/GPU selectors remain available in the navbar at every width. Mobile wraps navigation into two rows. CPU remains the default and GPU is disabled when WebGPU is unavailable. User-selected runtime is remembered.
