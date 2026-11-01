# Agent guide

This file applies to the entire repository. Follow explicit user instructions and any more specific `AGENTS.md` in the directory being changed. Keep this guide aligned with the actual scripts and architecture when those change.

## Rules to remember first

- **Rebuild and visually inspect screenshots after every UI change.** Regenerate the four tracked README images with `node scripts/capture-screenshots.mjs` against the final, freshly built interface. The complete procedure is below.
- **Use NVIDIA (`NVDA`) as the primary stock example.** Use it for stock UI development, happy-path demonstrations, new stock interaction checks, and main stock screenshots. Use real completed candles and real browser inference.
- **Keep the application static and browser-first.** Astro builds the site; a browser worker runs Kronos. Node prepares assets and market data. Python belongs exclusively to optional model export tooling.
- **Preserve honest data and results.** Missing snapshots, models, or unsupported runtimes must produce actionable states. Never substitute fabricated history, mock forecasts, or an apparent success after inference fails.
- **Preserve work already present.** Inspect the working tree before editing and keep unrelated user changes intact.

## Product and sources of truth

Stock Predictor is a research workspace for daily stock, ETF, and crypto forecasts. Its curated catalog currently contains 80 US equities, 20 ETFs, and 30 USD crypto pairs. All prices use USD. Horizons are 5, 10, or 20 trading sessions for stocks/ETFs and UTC calendar days for crypto.

Read the documents relevant to the task:

| Document | Use it for |
| --- | --- |
| `README.md` | Setup, user-facing capabilities, screenshots, and model overview |
| `PRODUCT.md` | Product scope and application boundaries |
| `DESIGN.md` | Night Studio visual system, themes, layout, and interaction rules |
| `CONTRIBUTING.md` | Contribution and maintenance expectations |
| `docs/architecture.md` | Browser worker, static assets, and model/data boundaries |
| `docs/configuration.md` | Subsets, environment variables, and prepared inputs |
| `docs/verification.md` | Unit, browser, screenshot, and model parity checks |
| `docs/deployment.md` | Pages, independent market publication, and static hosting |
| `docs/troubleshooting.md` | Missing assets, browser support, and download problems |
| `SECURITY.md`, `THIRD_PARTY_NOTICES.md` | Public artifacts, trust boundaries, licenses, and data rights |
| `tools/model-export/README.md` | Optional Python export and parity maintenance |

Check current source and maintained tests when older prose or exploratory artifacts disagree. Historical plans under ignored `docs/superpowers/`, `.cache/`, `.impeccable/`, and `artifacts/` are context, not a replacement specification.

## Repository map

| Location | Responsibility |
| --- | --- |
| `src/pages/index.astro` | Workspace composition and browser entry point |
| `src/pages/robots.txt.js`, `src/pages/sitemap.xml.js` | Build-generated static crawler files |
| `src/layouts/AppLayout.astro` | Document head, font loading, early theme selection, and base-aware favicon |
| `src/lib/seo.js`, `src/pages/robots.txt.js`, `src/pages/sitemap.xml.js` | Shared search/social metadata defaults, public URLs, and static crawler discovery |
| `src/components/` | Header, controls, chart shell, results, and information dialogs |
| `src/styles/global.css`, `src/styles/dark.css` | Shared layout, theme tokens, responsive behavior, and motion |
| `src/lib/app.js` | UI orchestration, history loading, selection, forecasting, and exports |
| `src/lib/chart.js` | SVG price/volume chart and pointer, keyboard, and touch inspection |
| `src/lib/state.js` | Selection generation guards, CSV formatting, and history ranges |
| `src/lib/preferences.js`, `src/lib/navigation.js` | Saved selections, appearance, popovers, and dialog focus |
| `src/lib/data.js`, `src/lib/asset-url.js` | Static/remote market JSON and deployment-base asset resolution |
| `src/lib/inference-client.js` | Worker requests, cancellation, runtime fallback, and lifecycle |
| `src/lib/inference-core.js` | Pure preprocessing, sampling, and close/volume decoding |
| `src/lib/model-cache.js` | Verified model downloads and optional browser caching |
| `src/lib/seo.js` | Shared metadata defaults, canonical/social URLs, and crawler-file helpers |
| `src/workers/inference-worker.js` | ONNX Runtime loading and real Kronos execution |
| `data/assets.json`, `data/models.json` | Curated assets and pinned model/tokenizer profiles |
| `data/calendar/` | Versioned XNYS sessions, close times, provenance, and licenses |
| `scripts/` | Node preparation, market refresh, packaging, screenshots, and checks |
| `tests/` | Node contracts and Playwright browser verification |
| `tools/model-export/` | Isolated Python exporter and unchanged vendored Kronos architecture |
| `docs/images/` | Four tracked README screenshots of actual forecasts |
| `public/social-preview.png` | Tracked social sharing image, generated separately from UI screenshots |
| `.github/workflows/` | Frontend CI, model/site deployment, and separate market-data publication |

Generated `.cache/browser-models/`, `.cache/pages-history/`, `public/data/`, `public/models/`, `public/runtime/`, and `dist/` are inputs/outputs of tooling, not source files to hand-edit.

## Setup and commands

Use Node.js 24 or newer and the repository-pinned **pnpm 11.25.0**. Dependencies and their exact versions are defined in `package.json` and `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm assets:prepare
pnpm dev
```

Development normally runs at `http://127.0.0.1:4321/`. Read the server output for the actual port. `dev` does not prepare missing snapshots or models.

| Command | What it actually verifies or produces |
| --- | --- |
| `pnpm test` | Node contracts; no model downloads, Python, or provider requests |
| `pnpm dev` | Astro development server through `scripts/astro.mjs` |
| `pnpm build:ui` | Astro compilation only; does not prepare or validate a complete deployment |
| `pnpm assets:prepare` | Package prepared models/runtime and fetch real completed market snapshots |
| `pnpm assets:offline` | Repackage models/runtime using cached real market snapshots |
| `pnpm models:check` | Validate all prepared model exports against the pinned profiles |
| `pnpm build` | Offline asset preparation, Astro build, and complete artifact check |
| `pnpm preview` | Serve the existing production `dist/`; does not rebuild it |
| `pnpm test:browser` | Real browser model parity and application smoke suite |
| `pnpm test:seo` | Static metadata, structured data, crawler files and sharing PNG with JavaScript disabled; use preview's `SITE_URL` and `SMOKE_URL` |
| `pnpm seo:image` | Regenerate `public/social-preview.png` from the maintained Playwright image source |
| `pnpm test:design` | Maintained Night Studio interaction, appearance, responsive, and screenshot suite |
| `pnpm test:seo` | Static metadata, crawler files, and sharing image with browser JavaScript disabled |
| `pnpm seo:image` | Regenerate the tracked 1200×630 sharing image with Playwright |
| `node scripts/capture-screenshots.mjs` | Regenerate the four tracked README images from real forecasts |
| `node scripts/check-dist.mjs` | Validate the built deployment's contents and size |

Use the existing Node/Astro wrapper instead of introducing another development server. The repository has no configured lint or TypeScript-check script; report the checks actually run.

### Prepared assets and smaller local builds

A clean checkout does not contain model binaries. Restore a trusted prepared bundle into `.cache/browser-models/<key>/` or follow the optional exporter guide. Frontend work does not require installing a Python environment.

For a smaller local forecasting setup, use the canonical stock and crypto examples:

```sh
pnpm assets:prepare --models mini --symbols NVDA BTC-USD ETH-USD
pnpm build:ui
pnpm preview
```

Add `--offline-data` to the preparation command when those real snapshots are already cached. Preparation rebuilds the generated public asset set for the requested subset; it is not an additive install. Only narrow it deliberately.

A subset is useful for local work. The design suite also selects ETH-USD, which is why the example includes it; the full browser smoke suite expects all three models and its normal catalog coverage. `pnpm build` prepares the full configured set again. `build:ui` succeeding with missing assets does not prove forecasting works. Avoid expensive model re-exports for unrelated UI or documentation tasks.

### Environment and repository-prefix checks

- `BASE_PATH`: deployment prefix, normally `/`, or `/stock-predictor/` for a project-path check.
- `SITE_URL`: canonical origin; set the public HTTPS origin for production canonical/social URLs and sitemap entries.
- `PUBLIC_MARKET_DATA_URL`: build-time remote market-data root. Only the market catalog and history may use it; models/runtime remain on the static site.
- `SMOKE_URL`: actual served URL for browser checks and screenshot capture, including port and prefix.
- `BROWSER_CHANNEL`: optional installed browser channel, for example `msedge`; otherwise the maintained suites use Playwright Chromium.
- `SMOKE_WEBGPU=1`: request real GPU parity checks where supported.

Keep `BASE_PATH` and `SITE_URL` consistent between build and preview. Rebuild after changing build-time configuration. Example in PowerShell, with prepared assets:

```powershell
$env:BASE_PATH = '/stock-predictor/'
pnpm build
pnpm preview --port 8020
# In a separate terminal:
$env:SMOKE_URL = 'http://127.0.0.1:8020/stock-predictor/'
pnpm test:browser
```

Use the equivalent environment syntax on other shells. Clear task-specific overrides before returning to root-path development. When a sandbox prevents the pinned package manager from starting, the exact underlying Node command from `package.json` can be used for local verification; disclose that substitution and avoid global configuration changes.

## Canonical examples: NVIDIA first

- Select **NVIDIA / `NVDA`** explicitly through the asset picker for primary stock review, screenshots, demos, and new stock happy-path tests. Include `NVDA` when preparing a development subset.
- Use **Kronos Mini + WebAssembly + 20 days** for a representative completed forecast. Check 5/10-day horizons or larger models when the task affects them. Keep the normal 3M chart range unless testing another range.
- Use **Bitcoin / `BTC-USD`** for the main crypto example. Ethereum is useful for a second-symbol/selection check; use an ETF such as `SPY` for ETF-specific work.
- NVDA is the canonical review/example asset. Preserve users' saved selections and existing first-load behavior unless the task explicitly changes those defaults.
- Retain contract tests using other symbols and synthetic numerical fixtures. The NVDA preference applies to representative product scenarios; it does not replace calendar edge cases or model parity fixtures.
- Read dates, prices, volume, and projected results from actual snapshots/inference. Avoid assertions that expect one random forecast curve or a hardcoded current NVIDIA price.

## Mandatory workflow after every UI change

This applies to visible Astro markup, CSS, typography, icons, wording, themes, responsive layout, controls, chart rendering, and browser behavior that changes what users see. Rebuild captures after the **last** UI edit, including a small polish or copy change.

1. **Prepare real assets.** Ensure the served site has valid model/runtime files and real NVDA, BTC-USD, and ETH-USD history for the screenshot/design suites. A compile-only build cannot supply missing forecasts.
2. **Validate and rebuild.** Run `pnpm test` and `pnpm build:ui`. For packaging, deployment, model, or runtime changes, use the full build and relevant browser parity checks as well.
3. **Serve the final build.** Start `pnpm preview` and set `SMOKE_URL` to its actual URL. A preview of an older `dist/` is not evidence for the edited UI.
4. **Run the maintained design suite.** Run `pnpm test:design` against that preview. It exercises real inference and writes supplementary captures under `.impeccable/review/`.
5. **Regenerate every tracked README screenshot:**

   ```sh
   node scripts/capture-screenshots.mjs
   ```

   This must refresh:

   - `docs/images/forecast-desktop.jpg`
   - `docs/images/forecast-crypto.jpg`
   - `docs/images/mobile-controls.jpg`
   - `docs/images/mobile-forecast.jpg`

   The current script selects NVDA for the desktop stock forecast and Bitcoin for crypto/mobile. Preserve the main stock capture's NVDA selection. For mobile stock-specific changes, add a real NVDA mobile capture alongside the existing crypto coverage. Keep README image paths and alt text consistent with what is shown.

6. **Open and inspect the actual regenerated images.** Check readability, clipping, overlap, chart/table alignment, visible controls, projected volume, and meaningful completed results. A successful file write alone is insufficient. Fix issues and repeat the final build/capture cycle.
7. **Capture affected states beyond the README set.** Cover dark and light appearance, desktop and mobile, and any changed empty, loading, error, popover, dialog, or tooltip state. Store supplementary review images in ignored `artifacts/` or `.impeccable/review/`, and identify them in the handoff.
8. **Include the refreshed tracked images in the change.** Report the capture command, actual tested URL, and remaining limitations. If real assets or browser execution are blocked, state that screenshot regeneration remains incomplete; do not claim full UI verification.

For browser installation, use `pnpm exec playwright install chromium`, or set `BROWSER_CHANNEL=msedge` if installed Edge is the available browser. Screenshot capture accepts `SMOKE_URL` and `BROWSER_CHANNEL`, just like the maintained browser suites.

Screenshots must come from the real application. Do not inject demo prices/predictions, paint a substitute chart, or replace screenshots with design mockups. Forecasts are stochastic, so refreshed curves can legitimately differ. Fresh browser contexts avoid inherited preferences; the browser's `colorScheme: 'light'` alone does not override the app's explicit dark default.

Documentation-only edits that do not alter the application UI do not require rerunning forecasts or screenshots. Changes to the capture workflow itself should be verified by running it.

## UI and accessibility conventions

Follow `DESIGN.md` and the existing components before adding a new visual pattern.

- Preserve Night Studio: graphite surfaces, flat structural regions, fine borders, restrained controls, self-hosted Inter, and tabular financial numerals. Use shared CSS custom properties for both themes.
- Fresh visits default to dark, including corrupt or blocked storage. Honor saved `light`, `dark`, and `system` choices. Keep theme selection and browser theme colors correct before first paint.
- Use text ticker badges consistently. Crypto badges omit `-USD` visually while labels retain the full symbol. Preserve the design's lack of company/crypto logo requests.
- Historical prices are solid cyan; projections are dashed amber with a dated boundary. Projected volume uses its distinct outlined treatment. Preserve distinctions beyond color alone.
- Keep source dates, fetch dates, model provenance, execution device, cancellation, and CSV available. Research disclaimers must remain visible and accurate.
- Preserve the desktop chart/analysis workspace and reachable Generate action. At widths of 900px and below, controls precede analysis in natural document flow; narrower layouts stack as documented.
- Review at 1440/1366px desktop, 1024px compact desktop, 768px tablet, 390px mobile, and 320px narrow mobile as relevant. Check a short desktop viewport around 600px high. Prevent page-wide horizontal overflow; confine necessary table scrolling to its region.
- Keep visible focus, semantic controls, labels, `aria-pressed`, status announcements, and keyboard access. Preserve chart arrows/Home/End/Escape and pointer/touch inspection.
- Keep mobile input text at least 16px, appropriate 44px touch targets, vertical chart panning, and pinch zoom. Tooltips must remain within the chart at the edges.
- Use native popovers/dialogs and return focus to the actual visible opener, including the footer disclaimer button.
- Preserve reduced-motion handling and fine-pointer-only hover styling. Keep motion restrained and functional.
- Coordinate DOM IDs/data attributes with `src/lib/app.js`, chart/navigation code, and browser tests. A markup change can silently break their contracts.

## Architecture and inference invariants

- Keep browser modules free of Node/Python runtime dependencies. Keep provider calls and packaging under `scripts/`; keep model execution inside the worker.
- Use `assetUrl()`/Astro's base for public assets and the Vite-emitted module worker URL. Resolve runtime and model files from the deployment root, independent of hashed worker directories. Verify project-prefix hosting after path/bundling changes.
- Model graphs and ONNX Runtime load lazily when inference is requested, outside the application JavaScript bundle. Initial page loading must not download the large runtime or model weights.
- Preserve single-threaded WASM (`numThreads = 1`) for ordinary Pages hosting. WebGPU requires a compatible device and HTTPS/localhost; some operators may run on CPU.
- Preserve cancellation, request IDs, and selection generation guards. Old history responses, status messages, errors, or forecasts must not update a newer selection.
- Bound worker/session/tensor memory and release resources on completion, error, replacement, or cancellation. Preserve bounded GPU-to-CPU recovery where implemented; record the provider that actually produced the result.
- Verify downloaded/cached model chunks with SHA-256. Replace corrupt cache content; reject corrupt network content. Blocked storage and quota errors must still allow verified in-memory inference.
- Keep Mini/Small/Base aligned with their pinned tokenizers. Preserve the encoder → two-stage generation → decoder pipeline, six input features, normalization, date encoding, context cap of 256, three averaged samples, temperature 1.0, and top-p 0.9 unless deliberately changing and validating the model algorithm.
- Preserve finite positive closes and nonnegative displayed/projected volume. Decode each channel with its own normalization; clamp physically invalid negative volume as the existing decoder does.
- CSV must retain exact forecast dates, symbol, currency, model identity, close, and volume, with proper escaping. Keep table, chart, summary, and export based on the same result.
- Keep user/provider text rendered as text rather than interpolated executable markup. Keep the workspace usable when localStorage or Cache Storage is unavailable.

## Search metadata and social previews

- Keep titles, descriptions, canonical links, Open Graph/X metadata, and JSON-LD in the original static HTML. Social crawlers must not require browser JavaScript or inference.
- Reuse `src/lib/seo.js` and the layout's title/description props. Use the configured public origin and deployment base; canonical URLs exclude transient query strings and fragments. Without `SITE_URL`, preserve the intentional omission of canonical/URL-based structured data and sitemap entries.
- Keep crawler files at the deployment base. On project hosting, the origin-root `/robots.txt` controls crawler rules; the project's nested file does not replace it. Keep the sitemap limited to real routes with truthful metadata.
- Regenerate `public/social-preview.png` with `pnpm seo:image` when changing its design/content. Preserve its 1200×630 dimensions, inspect the result, and include the tracked image. Ordinary builds do not regenerate it. This graphic is separate from the four real forecast screenshots.
- Run `pnpm test:seo` against a fresh preview after metadata, crawler, sharing-image, or origin/base changes. Supply the same `SITE_URL` used for the build and the actual prefixed `SMOKE_URL`.

## Market data and calendars

- Use the curated catalog and USD scope. ETFs share the `stock` kind and the supported US exchange-session calendar. Arbitrary symbols and additional exchanges require an intentional scope change.
- Preserve strict UTC `YYYY-MM-DD` ordering, valid finite OHLCV, unique dates, positive prices, and nonnegative volume. Normalization retains the last duplicate, requires at least 64 completed candles, and keeps at most 512.
- Adjust stock OHLC using the adjusted-close ratio; preserve share volume. Keep provenance and `adjusted`, `as_of`, `fetched_at`, and `future_dates` consistent.
- Stock candles become complete one minute after the actual calendar session close, including early closes and daylight-saving changes. Crypto excludes the current UTC day.
- Use `data/calendar/XNYS.json` for stock forecast sessions. Calendar coverage exhaustion is an error; a weekends-only approximation is insufficient. Preserve calendar source notices/licenses when updating it.
- Use snapshot `future_dates` in browser forecasts. Never generate weekend/holiday stock projections by adding calendar days in the UI.
- Provider failures may retain a previously validated real snapshot with its original dates. Mark unavailable assets honestly; fail preparation/publication when there are no valid snapshots.
- Remote market loading has a bounded timeout and falls back to bundled snapshots on network, HTTP, or JSON errors. Keep model catalogs, model binaries, and runtime assets on the static host.
- Describe observations as daily snapshots, with their age visible. Avoid live-quote, guaranteed-accuracy, calibrated-confidence, or trading-recommendation claims.
- Market redistribution rights are separate from the code license. Follow `THIRD_PARTY_NOTICES.md` before publishing provider data.

## Choosing verification

For code changes, run `pnpm test` and `pnpm build:ui` as the baseline. Add checks that exercise the changed behavior:

| Area changed | Additional verification |
| --- | --- |
| Any visible UI or behavior | Mandatory screenshot workflow above, including `pnpm test:design` |
| Selection, async lifecycle, CSV, preferences | Relevant Node contracts and real browser interaction/cancellation/export checks |
| Chart or volume | Frontend/volume contracts; real forecast, keyboard/touch inspection, tooltip edges, CSV, and responsive review |
| Worker, inference, cache, model graphs | Prepared models, `pnpm models:check`, full build, and `pnpm test:browser`; GPU parity on compatible hardware when relevant |
| Asset URLs, bundling, packaging, deployment | Full build, `node scripts/check-dist.mjs`, and browser smoke under `/stock-predictor/` |
| Metadata, crawler routes, social image | SEO Node contracts, fresh UI build, and `pnpm test:seo` with matching origin/base configuration |
| Market normalization/calendar/publication | Market, source, refresh, and packaging contracts; verify real snapshots when changing provider integration |
| Model exporter/profiles | Exporter parity checks, model-input validation, regenerated matching fixtures, and real browser parity for affected models |
| Documentation only | Verify described commands, paths, links, and claims against source; application tests only if needed for the edit |

`pnpm test:browser` validates all three real models against their fixed-token Python reference fixtures, plus loading, forecasts, CSV, cancellation, cache/settings, and mobile behavior. Fixed fixtures test numerical parity, not predictive accuracy or equality between random forecast paths. It also rejects backend dependencies and premature model/runtime downloads.

`pnpm test:design` (`tests/night-studio-browser.mjs`) is the maintained Night Studio design suite. Some older `scripts/check-*.mjs` helpers contain earlier assumptions, such as light-by-default appearance, older header dimensions, or port 4322. Inspect them before use, set `SMOKE_URL` explicitly, and update obsolete expectations when those helpers are in scope. Do not regress the current design to satisfy a historical assertion. Some helpers also assume their ignored screenshot directories already exist.

Add focused regression tests for behavioral fixes and meaningful contracts. Keep ordinary Node tests independent of provider access, large downloads, and Python. Use synthetic fixtures for algorithm/calendar edge cases, while product screenshots and end-to-end forecast evidence use real assets. Report unavailable hardware/assets separately from passing checks.

## Model maintenance and deployment

- Python 3.12 and `.venv-models/` are optional maintainer tooling only. Keep dependencies in `tools/model-export/requirements*.txt`.
- Update `data/models.json` and the exporter's `PROFILES` together when changing pinned weights/tokenizers. Keep manifests, graphs, hashes, and parity fixtures from the same export/revisions together.
- Preserve unchanged upstream architecture in `tools/model-export/vendor/kronos/` and its license. Use wrappers for export adaptations and run their upstream/ONNX parity checks.
- Deploy only `dist/`. Keep the complete artifact below **950,000,000 bytes**, model chunks at most **16 MiB**, and development files/symlinks out of the deployment.
- Frontend CI runs Node tests and UI compilation without downloading models. Pages separates model preparation, the Node website build/browser smoke, and deployment. Preserve automatic recovery from missing/invalid model caches.
- Daily market publication is a separate Node-only workflow and `market-data` branch. It must not require model export or a full website redeployment. Preserve its validated fallback and non-force-push publication behavior.
- Docker/nginx serves an already built static artifact; it is not an inference service. Preserve correct JavaScript/WASM serving and HTTPS/localhost requirements.
- Builds and local edits do not authorize pushing, publishing snapshots, changing repository settings, or deploying. Perform external publication only when the user requests it.

## Editing and handoff

- Inspect `git status --short` and the relevant diff before editing. Keep the change focused; avoid formatting unrelated modules or discarding existing work.
- Use ESM and the existing plain-browser-module/Astro patterns. Follow `.editorconfig`: UTF-8, LF, two spaces for normal source, four for Python, and final newlines. Preserve vendor-file formatting.
- Reuse existing helpers, CSS tokens, and native browser controls. Introduce dependencies only when needed, retain pinned versions, and update the pnpm lockfile intentionally.
- Keep secrets, `.env*`, local environments, caches, model binaries, generated public assets, and build output out of Git. Preserve tracked licenses/notices and the tracked README images. Never force-add ignored artifacts to make a check appear complete.
- Update the relevant product, design, configuration, verification, or deployment documentation when behavior changes. Update this guide if its commands or invariants change.
- Before handing off, review the final diff and working-tree status, verify only intended files changed, and report what changed, checks actually run, screenshot paths for UI work, and any remaining limitations. Do not claim browser/model/GPU coverage from a compile-only build.
