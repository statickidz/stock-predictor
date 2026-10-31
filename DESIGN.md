---
name: Stock Predictor
description: A clear, comfortable workspace for daily market research.
colors:
  primary: "#0877d1"
  primary-hover: "#0967b4"
  canvas: "#0e161d"
  surface: "#111c25"
  control: "#0f1922"
  soft: "#17232e"
  ink: "#eaf2fa"
  muted: "#9eafc0"
  line: "#2b3b49"
  accent: "#39b7f5"
  accent-soft: "#10344e"
  observed: "#39b7f5"
  projected: "#efb65c"
  forecast-ground: "#171d23"
  positive: "#64d9af"
  negative: "#ff7c8c"
  action-ink: "#ffffff"
  light-canvas: "#f6f8fa"
  light-surface: "#ffffff"
  light-ink: "#172c3e"
  light-muted: "#566a7d"
  light-line: "#d8e2ea"
typography:
  title:
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif'
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  quote:
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif'
    fontSize: "14px"
    lineHeight: 1.75
  label:
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  control: "6px"
  overlay: "12px"
spacing:
  compact: "4px"
  field: "14px"
  rail-inset: "22px"
  analysis-block: "24px"
  analysis-inline: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  field:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "42px"
---

# Design System: Stock Predictor

## Overview

**Creative North Star: "Night Studio"**

A comfortable research workspace with graphite surfaces, clear financial data and restrained native controls. Fine rules and tonal changes establish structure. The chart leads; the composer and exact daily results stay easy to scan.

Dark is the default for fresh visits, including unavailable or malformed storage. Existing light, dark and system preferences remain honored. The appearance button toggles directly and saves an explicit choice. Theme styles and browser theme color are selected in the document head before paint.

## Colors

The frontmatter records the default dark palette. Blue identifies the primary action; cyan identifies selection, focus and observed prices. Amber and a dashed stroke distinguish projected prices. Positive and negative values use separate semantic colors without implying confidence.

Light appearance uses a cool white canvas and surface with deep slate text. Its remaining tokens in global.css are soft #edf2f6, control #f8fafc, accent/action #086dbb, action hover #055b9e, accent-soft #e6f2fc, observed #087cac, projected #a56411, forecast ground #fbf7f0, positive #087852 and negative #be3447. Dark error surfaces use #301e23 with #82515c borders; light uses #fff0ed with #d99485.

All component colors resolve through CSS properties. Chart points, lines, areas, axes, volume, tooltips and browser selection follow the active theme.

## Typography

Inter is self-hosted as a variable WOFF2, normal weights 100–900, preloaded and loaded through @font-face with font-display: swap. The original font license ships under public/fonts. Segoe UI and Arial are fallbacks.

The wordmark is 22px/650; asset names 22px/600; quotes 28px/600; composer heading 19px/600; summary values 22px/600; results heading 15px/600. Controls and table values use 12px. Secondary guidance uses 11px; chart axes, inspection hints and provenance use 10px. Dialog prose uses 14px with 1.75 line height.

Financial values use tabular numerals. Tracking stays between normal and -0.025em. Mobile search and selects use 16px to avoid browser input zoom; the wordmark becomes 19px, then 17px on small phones.

## Layout

Desktop uses a 68px app bar, a flexible workspace and a research footer. The analysis column is flexible; the right rail is 360px, reduced to 316px at widths up to 1200px. At heights up to 760px the bar becomes 62px and composer spacing tightens.

The analysis scrolls independently. The rail heading and execution area remain visible while settings scroll. The asset list scrolls within a bounded height. Desktop analysis insets are 24px vertically and 26px horizontally; the rail uses 22px horizontal insets.

At 900px and below, controls precede analysis in natural document flow. Tablet asset browsing and settings use two columns; at 600px they stack. Mobile insets are 16px. The chart is 380px tall on tablets and 320px on phones. Mobile summary values use two columns with the through-date across the next row.

The exact results table scrolls within a 360px maximum height, keeps its headers sticky and exposes a keyboard-focusable scroll region. Phones can scroll horizontally through its columns.

## Elevation & Depth

Structural regions use one-pixel borders and tonal surfaces, without floating cards. The chart tooltip uses 0 4px 16px #0002; navbar popovers use 0 12px 36px #0003. Native dialogs provide protected focus with a dark backdrop.

## Shapes

Controls, search, ticker badges and buttons use 6px corners. Popovers and dialogs use 12px. Chart, forecast summary and table remain flat. Selected segments and assets use a fine cyan border and accent-soft fill.

## Components

The Generate action is full-width and at least 46px tall. Disabled actions use muted surface tokens. Secondary actions use control surfaces and fine borders. Focus uses a two-pixel accent outline with a three-pixel offset. Mobile market, horizon, range, navigation and secondary controls have 44px minimum height.

Every asset uses a text ticker badge in both the picker and selected-asset heading. Crypto badges omit the redundant -USD suffix; full symbols remain in the asset labels. Company and cryptocurrency logo images are not used or requested. Badges share the same soft surface, fine border and muted text across the catalog.

Observed chart prices use a solid two-pixel cyan line and a low-opacity area. Projections use a two-pixel amber dashed line, dated separation, and outlined future volume bars. These visuals are drawn from actual data. Keyboard, pointer and touch inspection expose exact closing price and volume. Touch preserves vertical panning and pinch zoom.

The integrated summary and daily projections appear only after genuine inference. CSV, model provenance, observation dates, fetch dates and uncertainty remain available. Selection changes and cancellation retain the existing forecast behavior.

Help and Settings use native popovers. About, How it works and Disclaimer use native dialogs. Closing a dialog returns focus to its actual visible opener, including the footer disclaimer action. Utility and error icons use consistent inline SVG.

No entrance choreography is used. Loading has one translating rule; reduced-motion disables animation. Hover styles apply only to fine pointers.

## Do's and Don'ts

- Do keep exact market dates, model provenance and on-device execution states readable.
- Do distinguish observed and projected data by stroke treatment as well as color.
- Do use ticker badges consistently, preserve keyboard focus and retain natural mobile document flow.
- Do keep light appearance coherent with the same layout and semantic chart vocabulary.
- Don't copy illustrative values or weekend stock dates from a design comp into live output.
- Don't present projections as live quotes, guaranteed outcomes or calibrated confidence intervals.
- Don't replace the flat workspace with nested floating cards or decorative motion.
