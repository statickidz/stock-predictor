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
    fontSize: "34px"
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

Approved visual direction: a restrained financial workspace for inspecting daily prices and model forecasts. Mode: Operate. One screen; chart first on desktop, inputs first on mobile.

- Warm white canvas `#f8f7f4`, white chart surface, quiet olive-neutral control panel `#f0f0e9`, charcoal `#262b29`, orange primary action `#b74629`.
- A single system sans family, tabular price numerals, clear labels and fixed type sizes. No display typography or decorative animation.
- Observed prices use a solid muted green line; projections use a dashed orange line with a dated divider. Never imply a calibrated confidence interval.
- Forms use native buttons and inputs, visible focus, accessible names, 16px mobile inputs and 44px-class mobile touch targets.
- Maximum desktop canvas 1450px, chart plus compact 304px form. At 780px, stack the form above the chart. Results table and explanations follow.
- Status, errors, provenance and dates are functional content. Real history loads first; forecast remains empty until genuine inference succeeds.

## Colors

The frontmatter records the shipped palette. Muted text is `#62695f`; secondary text on the form uses `#5c6753`. Accent marks actions, observed prices are solid green, and projected prices are dashed orange. Color does not imply model confidence.

## Typography

One sans family carries headings and controls. Prices use tabular numerals. The headline reduces to 29px at the mobile breakpoint. Mobile search inputs use 16px.

## Layout

The desktop chart and 304px form share a 22px gap. At 1100px the form becomes 280px; at 780px it stacks above the chart. At 420px insets reduce. Above 1500px the chart grows taller. Mobile chart range controls occupy their own row beneath the quote.

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
