# AfyaLink Frontend — Premium-Quality Fix Plan

> **Status:** Planning only — no code will be written.
> **Generated:** 2026-10-15
> **Scope:** `frontend/src/`

---

## 0. Token Reference (from `globals.css`)

| Category | Tokens |
|---|---|
| **Brand / surfaces** | `--color-brand-{50..950}`, `--color-ink`, `--color-muted`, `--color-line`, `--color-line-strong`, `--color-sunken`, `--color-canvas` |
| **States** | `--color-success`, `--color-error`, `--color-sev-{low,moderate,high,critical}`, `--color-amber`, `--color-amber-soft`, `--color-amber-ink`, `--color-pending/-bg`, `--color-syncing/-bg`, `--color-synced/-bg`, `--color-failed/-bg` |
| **Radii** | `--radius-xs` (4) → `--radius-2xl` (22) |
| **Shadows** | `--shadow-{xs,sm,md,lg,xl,ring,card,card-hover,glow,brand-sm/-md/-lg,amber-sm/-md,error-sm/-md}`, `--shadow-floating`, `--shadow-pressed`, `--shadow-inner`, `--shadow-outline` |
| **Motion** | `--duration-micro` (140ms), `--duration-ui` (220ms), `--duration-section` (520ms), `--duration-page` (420ms); `--ease-out`, `--ease-in-out`, `--ease-emphasize`, `--spring` |
| **Fonts** | `--font-sans`, `--font-display` |

## 0.1 Motion mismatch (cross-reference)

- `globals.css:115` → `--duration-micro: 140ms`
- `motion/index.tsx:15` → `DURATION.micro = 0.16` (160 ms)
- The motion comment on `motion/index.tsx:8-9` says "micro (~160ms)".
- **Decision:** Standardize on **140 ms** (`0.14`). Rationale: CSS is the source of truth for tokens, and the `@motion` utilities in `form.tsx` already reference `var(--duration-micro)`. Updating only the JS file avoids touching 20+ Tailwind class strings. (If 160 is preferred instead, change the CSS token — either way, both must match.)

---

## 1. BLOCKER — `report-form.tsx`: Migrate to floating-label fields

**File:** `frontend/src/features/reports/report-form.tsx`

### Problem
Lines 11-24 import `Field`, `Input`, `Textarea`, `Select`, `describedBy`, `FieldError` from `@/components/ui` (these resolve to `field.tsx`, the legacy non-floating-label components). Lines 294-309, 359-392, 439-449 use this legacy stack. No floating labels, no animated validation, no character count on `conditionName` (max 120 per `report-schema.ts:12`) or `symptoms` (max 600 per `report-schema.ts:20`).

### What the final code should look like (per field)

**Imports (lines 11-24):** Replace
`Field`, `Input`, `Textarea`, `Select` in the import list with `FloatingLabelInput`, `FloatingLabelTextarea`, `FloatingLabelSelect`. Keep `Button`, `ButtonLink`, `ErrorState`, `Panel`, `Select`→`FloatingLabelSelect`, `StatusIndicator`, `FormSection`, `FieldError`. Remove `describedBy` and `Field` if no longer used (check residual uses below).

> Note: `FieldError` is still needed at lines 291, 335, 420 for the radio groups and `casesCount` custom input (which cannot use floating labels). Keep it.

**conditionName (lines 294-309):**
- Replace `<Field name="conditionName" label="Condition or issue" required error={...} hint="Pick a suggestion or type your own.">` wrapper + `<Input ...>` child with a bare `<FloatingLabelInput name="conditionName" label="Condition or issue" required hint="Pick a suggestion or type your own." error={errors.conditionName?.message} characterCount={120} ...{...register("conditionName")} />`.
- Remove `id="conditionName"` prop override (let `FloatingLabelInput` set `id={name}` internally — see `form.tsx:623`).
- Remove the explicit `placeholder="e.g. Malaria"` (the floating-label component sets `placeholder=" "` internally at `form.tsx:628` which drives the `:placeholder-shown` peer selector; a real placeholder would break the float animation — see `form.tsx:593-594`).
- Keep the `<datalist id="condition-suggestions">` block (lines 304-308) — it passes through via the `list` attribute inherited from `InputHTMLAttributes`.
- The `aria-invalid` and `aria-describedby` props are now handled internally by `FloatingLabelInput` (`form.tsx:626-627`); remove the manual ones.

**ageGroup (lines 359-367):**
- Replace `<Field ...>` + `<Select ...>` with `<FloatingLabelSelect name="ageGroup" label="Age group" required error={errors.ageGroup?.message} ...{...register("ageGroup")} />`.
- Keep the `<option>` children. `FloatingLabelSelect` wraps `SelectHTMLAttributes` (`form.tsx:690`) so `register`'s spread works.

**observedAt (lines 373-381):**
- Replace `<Field ...>` + `<Input type="datetime-local" ...>` with `<FloatingLabelInput name="observedAt" label="Observed at" type="datetime-local" required error={errors.observedAt?.message} max={localDateTimeNow()} ...{...register("observedAt")} />`.
- `FloatingLabelInput` extends `InputProps & InputHTMLAttributes` (`form.tsx:618`), so `type`, `max`, and `register` pass through.

**locationId (lines 383-392):**
- Replace `<Field name="locationId" label="Area" optional ...>` + `<Select ...>` with `<FloatingLabelSelect name="locationId" label="Area" optional error={errors.locationId?.message} hint={locations.error && !locations.data ? "Areas couldn't load. You can still save." : undefined} disabled={!locations.data} ...{...register("locationId")} />`.
- The `disabled={!locations.data}` prop passes through `SelectHTMLAttributes`.

**symptoms (lines 439-441):**
- Replace `<Field name="symptoms" label="Symptoms" optional hint="...">` + `<Input placeholder="fever, cough" ...>` with `<FloatingLabelInput name="symptoms" label="Symptoms" hint="Separate with commas, e.g. fever, cough" optional error={errors.symptoms?.message} characterCount={600} ...{...register("symptoms")} />`.
- Remove the manual `placeholder` and `aria-describedby`.

**notes (lines 442-449):**
- The `notes` field has a rich inline privacy notice with a `ShieldCheck` icon and a live character count (`(notes ?? "").length/2000` on line 447). `FloatingLabelTextarea` supports `characterCount={2000}` (its own counter at `form.tsx:666-676`).
- **Migration approach:** Replace `<Field>` + `<Textarea>` with `<FloatingLabelTextarea name="notes" label="Notes" optional error={errors.notes?.message} characterCount={2000} rows={3} ...{...register("notes")} />`. Move the privacy notice (lines 444-448) to render as a sibling below the field (a `<FieldHint>` or a plain `<p>`). The `FieldError` inside `FloatingLabelTextarea` handles validation messaging; the manual `aria-describedby="notes-privacy"` on the `Textarea` can stay on a plain element or be removed since the privacy note is supplementary (not field-error/hint context — keep it as `id="notes-privacy"` on an adjacent `<p>` and do NOT attach it to the textarea's `aria-describedby` since `FloatingLabelTextarea` manages that internally).
- Keep the `maxLength={2000}` — `FloatingLabelTextarea` extends `TextareaHTMLAttributes` so it passes through.

**casesCount (lines 339-358):** Leave as-is. This is a custom +/- stepper, not a plain input. `FloatingLabelInput` doesn't support custom inner controls. The standalone `<FieldError id="casesCount-error" message={errors.casesCount?.message} />` at line 352 stays.

**category radio group (lines 257-291):** Not a form input field. The `<FieldError id="category-error" message={errors.category?.message} />` on line 291 stays.

**severity radio group (lines 312-336):** Same — `<FieldError id="severity-error">` stays.

### Gotchas
- `react-hook-form`'s `register()` returns `{ onChange, onBlur, ref, name }`. `FloatingLabelInput` destructures `name`, `label`, `error`, `characterCount`, etc. from its own props and spreads the rest (`...props`) onto the `<input>` (`form.tsx:622-624`). So `{...register("conditionName")}` is safe — `name` from register is the same value, `onChange`/`onBlur`/`ref` go to the input. No conflict.
- `FloatingLabelInput` uses `placeholder=" "` internally. Do NOT pass a visible placeholder.
- The `peer-placeholder-shown` selector on the label (`form.tsx:593`) requires the input to actually render a placeholder. `FloatingLabelInput` hardcodes `placeholder=" "` (`form.tsx:628`); this is what makes the float-down work. Ensure migration doesn't accidentally strip it.
- `FloatingLabelTextarea` does **not** forward `id` — it hardcodes `id={name}` (`form.tsx:659`). Remove any explicit `id` prop.

**Effort:** M (medium-large — 6 fields, careful prop reconciliation, testing)

---

## 2. BLOCKER — `pdf-generator.ts`: Replace hardcoded tokens with CSS variables

**File:** `frontend/src/lib/pdf-generator.ts`

### Problem
Lines 46-67: The entire `<style>` block hardcodes every value. Specifically:
- Line 49: `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` → should be `var(--font-sans)`.
- Line 33: `color:#0b3d2e` (section heading) → `var(--color-brand-900)` (`#0B3D35`).
- Line 37: `color:#52606d` (muted text) → `var(--color-muted)` (but note `globals.css:20` `--color-muted: #687873` — the PDF uses `#52606d` which was the old value; use `--color-muted`).
- Line 50: `linear-gradient(135deg, #0b3d2e 0%, #1f6b4f 100%)` → `linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-600) 100%)`.
- Line 37: `color:#172522` (table value) → `var(--color-ink)` (`globals.css:19`).
- Line 53: `color:#52606d` (meta text) → `var(--color-muted)`.
- Line 54: `color:#8a9793` (footer text) → `var(--color-muted)`.
- Line 48: `@page { margin: 18mm 16mm }` — acceptable, not a design token, can stay.
- Line 37: `border-bottom:1px solid #e6ece8` → `var(--color-line)` (`globals.css:21`).

### What the final code should look like

Add a `:root { ... }` block at the top of the `<style>` string (before `@page`) that defines the subset of tokens used, mirroring `globals.css` values for light mode. Then replace all hardcoded values in the `<style>` with `var(--token)` references.

```css
:root {
  --font-sans: var(--font-geist), ui-sans-serif, system-ui, sans-serif;
  --color-brand-900: #0b3d35;
  --color-brand-600: #146c5a;
  --color-ink: #172522;
  --color-muted: #687873;
  --color-line: #e3eae6;
  --color-surface: #ffffff;
  --color-canvas: #f7f9f7;
}
```

Then:
- `body { font-family: var(--font-sans); color: var(--color-ink); }`
- `.brand-bar { background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-600) 100%); ... }`
- Section heading color: `var(--color-brand-900)`
- Table cell color: `var(--color-ink)`
- Table row border: `var(--color-line)`
- Meta color: `var(--color-muted)`
- Footer color: `var(--color-muted)`

### Risk / approach decision
The popup window is a separate document opened via `window.open("", "_blank")` (`pdf-generator.ts:27`). It does **not** inherit the parent page's CSS variables. Two approaches:

1. **Inline `:root` block (recommended for this fix):** Define the needed tokens in the popup's own `<style>` as shown above. This satisfies the audit's requirement ("should use `var(--...)`"). The downside is the values are duplicated from `globals.css` and must be kept in sync manually.

2. **Runtime computed-style injection (enhancement):** Read `getComputedStyle` from `win.opener.document.documentElement` at the top of `openPrintablePdf`, extract the `var()` values, and inject them into the popup `<style>`. More robust but more complex; treat as a **follow-up** if time permits.

### Gotchas
- `@radius` tokens: the PDF uses `border-radius: 10px` on `.brand-bar` (`pdf-generator.ts:50`). Map to `var(--radius-md)` (8px) or `var(--radius-lg)` (12px). `globals.css:64`. The audit says "radii" should use tokens; `--radius-md` (8px) is closest to 10px. Or keep a `--radius-brand-bar` local var. Decision: use `var(--radius-md)` and define it in the popup `:root`.
- Tailwind `@font-sans` references `var(--font-geist)` which is a Google Font loaded in the Next.js app. The popup won't load Geist. The fallback chain (`ui-sans-serif, system-ui, sans-serif`) will still produce a reasonable result. Acceptable for a print-to-PDF flow.
- No `prefers-reduced-motion` concern in the popup — it's a static print surface.

**Effort:** S (small — ~30 lines of string template)

---

## 3. BLOCKER — `location-picker-map.tsx`: Keyboard navigation, focus ring, zoom control, branded pin, tile loading state

**File:** `frontend/src/features/reports/location-picker-map.tsx`

### Problem
- Line 26: `zoomControl={false}` — removes the zoom +/- buttons, and since there's no scroll-zoom alternative documented, users on touchscreens have no zoom.
- Line 22: The outer `<div>` wrapper has no `tabIndex`, no `onKeyDown`, no `focus-visible` ring. Keyboard-only users cannot pan the map.
- Line 35: `new L.Icon(icon)` uses the default Leaflet pin image (loaded from unpkg in `location-picker.tsx:11-13`). No branded pin.
- No tile-loading state — the map flashes empty gray while tiles download.

### What the final code should look like (pseudo-code)

```tsx
export default function LocationPickerMap(props: LocationPickerMapProps) {
  const { center, latitude, longitude, onPick, icon, className } = props;
  const mapRef = useRef<L.Map | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  const onMapReady = (map: L.Map) => {
    mapRef.current = map;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const map = mapRef.current;
    if (!map) return;
    const pan = 40; // px
    switch (e.key) {
      case "ArrowUp":    map.panBy([0, -pan]); break;
      case "ArrowDown":  map.panBy([0, pan]);  break;
      case "ArrowLeft":  map.panBy([-pan, 0]); break;
      case "ArrowRight": map.panBy([pan, 0]);  break;
      case "+":
      case "=": map.zoomIn(); break;
      case "-":  map.zoomOut(); break;
      case " ":  onPick(map.getCenter().lat, map.getCenter().lng); break;
      default: return;
    }
    e.preventDefault();
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cx(
        "overflow-hidden rounded-[var(--radius-2xl)] ring-1 ring-inset ring-line focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/35 focus-visible:ring-offset-0",
        className,
      )}
    >
      <MapContainer
        ref={mapRef}             // new
        center={center}
        zoom={13}
        zoomControl={true}        // changed from false
        doubleClickZoom={false}
        scrollWheelZoom={true}     // explicit; restore zoom via scroll
        className="h-full w-full"
        whenCreated={onMapReady}   // react-leaflet v5 callback
        // OR use <ReactLeafletMapContainer ...> ref pattern
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="..."
          eventHandlers={{
            loading: () => setTilesLoaded(false),
            loaded:  () => setTilesLoaded(true),
          }}
        />
        {!tilesLoaded && (
          <div className="absolute inset-0 grid place-items-center bg-sunken text-muted">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Loading map…
          </div>
        )}
        {latitude !== undefined && longitude !== undefined && (
          <Marker position={[latitude, longitude]} icon={brandedIcon} />
        )}
        <Pinner onPick={onPick} />
      </MapContainer>
    </div>
  );
}
```

**Specific changes by line:**

| Line | Current | Target |
|---|---|---|
| 22 | `<div className={...round-2xl ring-1 ring-inset ring-line...}>` | Add `tabIndex={0}`, `onKeyDown` handler, `focus-visible:ring-[3px] focus-visible:ring-brand-500/35 focus-visible:ring-offset-0`, use `rounded-[var(--radius-2xl)]` |
| 26 | `zoomControl={false}` | `zoomControl={true}` |
| 23-28 | `<MapContainer center={center} zoom={13} zoomControl={false} doubleClickZoom={false} className="h-full w-full">` | Add `scrollWheelZoom={true}`, add `ref`/`whenCreated` to capture map instance for keyboard pan |
| 30-33 | `<TileLayer>` with no event handlers | Add `eventHandlers={{ loading: () => setTilesLoaded(false), loaded: () => setTilesLoaded(true) }}` |
| 34-36 | `<Marker position={[...]} icon={new L.Icon(icon)} />` | Replace with a branded `L.divIcon` — see #3a below |
| 44-50 | `Pinner` component — unchanged | Keep as-is (handles click-to-pick) |

#### 3a. Branded pin (new `divIcon`)

The `PIN_ICON` in `location-picker.tsx:10-18` currently points at unpkg Leaflet default images. Replace with a `L.divIcon` that renders an SVG pin in brand green:

```ts
// In location-picker.tsx (exported as PIN_ICON)
export const PIN_ICON: L.IconOptions = {
  html: '<svg ...>...pin path filled with var(--brand-600)...</svg>',
  className: "afyalink-pin",
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [0, -42],
};
// CSS: .afyalink-pin { ... } using var(--color-brand-600) etc.
```

**But** — `L.divIcon` HTML is rendered in a map pane that may not have access to CSS custom properties if the icon CSS isn't loaded. Since the map runs in the browser where `globals.css` is active, `:root` vars are available. Inject a small `<style>` in the `html` SVG or rely on the global `:root`. Use inline SVG with fill set to a known token value (e.g. `fill="#146c5a"`) and a CSS class for shadow/animation. Simpler: inline fill with the hex value but scope it to the token via a comment. Since this renders inside the Leaflet pane (DOM in the browser), `var(--color-brand-600)` WILL resolve.

**Recommendation:** Define the SVG with `fill="var(--color-brand-600)"` — works in modern browsers.

#### 3b. Tile loading state

Use a `useState` + `eventHandlers` on `TileLayer` (react-leaflet v5 supports `eventHandlers` on `TileLayer`). While `!tilesLoaded`, render an absolutely-positioned overlay. Position the overlay with `absolute inset-0` inside the `MapContainer`'s parent — but the parent is the tabbable `<div>`. Ensure the overlay `z-index` is above the tile pane (Leaflet tile pane z-index is 200; use `z-10` on a sibling inside the div, or use Leaflet's `map.createPane` with high z-index). Simpler: overlay is a sibling that covers the whole map area via absolute positioning within the focusable div.

### Gotchas
- **react-leaflet v5 API:** `useMapEvents` is correct (already used on line 45). `MapContainer` accepts a `ref` (type `L.Map`). The `whenCreated` callback was removed in v5 in favor of `ref`; verify which API the installed version uses. `react-leaflet@5.0.0` — check `react-leaflet` docs: in v5, `MapContainer` does accept a `ref` that gives the `L.Map` instance directly.
- **SSR:** This component is loaded via `next/dynamic` with `ssr: false` (see `location-picker.tsx:23-26`), so `window`/`L` references are safe. No `next/dynamic` SSR concern.
- **`next/dynamic` + `useRef`:** The `mapRef` is only set after mount in the browser; `handleKeyDown` must null-check `mapRef.current`.
- **TileLayer eventHandlers:** In react-leaflet v5, `TileLayer` supports `eventHandlers` prop. If it doesn't, fall back to `useMapEvent("tileload", ...)` / `useMapEvent("tileunload", ...)` in a child component.

**Effort:** M (medium — keyboard handler, ref capture, divIcon SVG, tile state overlay)

---

## 4. SHOULD FIX — `--duration-micro` mismatch

**Files:**
- `frontend/src/app/globals.css:115` → `--duration-micro: 140ms`
- `frontend/src/components/motion/index.tsx:15` → `DURATION.micro = 0.16`
- `frontend/src/components/motion/index.tsx:8-9` (comment says "~160ms")

### Decision
**Standardize on 140 ms / `0.14`.** CSS tokens are the source of truth; the motion constants should match.

### What to change
- `motion/index.tsx:15`: Change `DURATION.micro = 0.16` → `DURATION.micro = 0.14`
- `motion/index.tsx:9`: Update comment "micro (~160ms)" → "micro (~140ms)"
- Optionally add a comment on `globals.css:115` cross-referencing `DURATION.micro`.

### Verification
- `tsc --noEmit` — no type error (number literal)
- Grep the codebase for `0.16` to ensure no other JS hardcodes 160ms; grep for `160ms` in CSS.

**Effort:** XS

---

## 5. SHOULD FIX — Hardcoded values across components

### 5a. `app-shell.tsx`

**File:** `frontend/src/components/app-shell.tsx`

| Line | Current | Token |
|---|---|---|
| 95 | `shadow-[4px_0_24px_-16px_rgb(11_61_53/0.18)]` | Use `var(--shadow-xl)` or define a sidebar-specific shadow. The RGB `11_61_53` = `#0B3D35` = brand-900. Closest existing: `--shadow-xl` (`globals.css:79`) which is `0 2px 6px rgb(38 57 77 / 0.05), 0 32px 72px -20px rgb(38 57 77 / 0.32), 0 10px 24px -10px rgb(38 57 77 / 0.14)`. Not an exact match (the hardcoded one is a directional sidebar glow). **Recommendation:** Add a new token `--shadow-sidebar` in `globals.css` for this specific shadow, or reuse `--shadow-xl`. If reusing, just replace with `shadow-[var(--shadow-xl)]`. |
| 338 | `rounded-[22px]` (TabBar dock) | `rounded-[var(--radius-2xl)]` (`--radius-2xl` = 22px per `globals.css:67`) |
| 292 | `rounded-2xl` (UserMenu popover) | `rounded-[var(--radius-2xl)]` — Tailwind `rounded-2xl` already = 1rem (16px) by default, which equals `--radius-xl` (16px). The audit says "2xl" should use tokens. Replace with `rounded-[var(--radius-xl)]`. |
| 413 | `rounded-2xl` (MoreSheet header) | Same: `rounded-[var(--radius-xl)]` |

**Gotcha:** `app-shell.tsx:95` uses a raw Tailwind shadow utility `shadow-[4px_0_24px_-16px_rgb(11_61_53/0.18)]`. In Tailwind v4, arbitrary values with `rgb(...)` syntax must use the CSS-safe form `rgb(11_61_53/0.18)` (underscores) — which it already does. Replacing with `shadow-[var(--shadow-xl)]` works in v4.

### 5b. `landing/sections.tsx`

**File:** `frontend/src/features/landing/sections.tsx`

**HeatIllustration (lines 141-167):**
- Line 143: `{ x: 30, y: 58, r: 34, c: "#c43d4b", o: 0.55 }` → `c: "var(--color-error)"` (`globals.css:42` `#c43d4b`)
- Line 144: `{ x: 34, y: 54, r: 52, c: "#f3b66a", o: 0.5 }` → `c: "var(--color-amber)"` (`globals.css:37`)
- Line 145: `{ x: 70, y: 40, r: 30, c: "#1d8a70", o: 0.55 }` → `c: "var(--color-brand-500)"` (`globals.css:30`)
- Lines 146-147: `{ c: "#80cfb1", ... }` → `c: "var(--color-brand-300)"` (`globals.css:28`)
- Line 157-158: `stroke="#cfdad4"` → `stroke="var(--color-line-strong)"` (`globals.css:22`)
- **Caveat:** SVG `fill` / `stroke` attributes accept CSS variables in modern browsers. This works in the browser. Tailwind's `@layer` won't interfere.

**HowItWorks (lines 192-202):**
- Line 194: `bg-brand-200` (vertical phone connecting line) — this IS using a token (Tailwind class). But `brand-200` is `--color-brand-200` (`globals.css:26`). Already tokenized. No change needed.
- Line 195: `bg-line-strong` (horizontal tablet line) — also tokenized. No change.
- Line 197: `stroke="rgb(20 108 90 / 0.7)"` → `stroke="rgb(var(--color-brand-600-rgb) / 0.7)"` — but the token `--color-brand-600` is `#146c5a` (hex), not RGB. In Tailwind v4, you can use `rgb(20 108 90 / 0.7)` directly. To reference the token: since `--color-brand-600: #146c5a`, we can't directly use `rgb(var(--color-brand-600) / 0.7)` with hex. **Recommendation:** Convert to use the CSS variable with opacity: since Tailwind v4 resolves `text-brand-600/70` etc., but for SVG `stroke` attribute it doesn't. Use: `stroke="var(--color-brand-600)"` and `stroke-opacity="0.7"`. Or use a CSS `<style>` rule. Simplest: `stroke="var(--color-brand-600)" stroke-opacity="0.7"`.
- Line 201: `stroke="rgb(33 134 91 / 0.9)"` → `var(--color-synced)` (`globals.css:49` = `#1a6e4a`... wait, 33 134 91 = `#21865a` = `--color-success`). So → `stroke="var(--color-success)" stroke-opacity="0.9"`.

### 5c. `sync-screen.tsx`

**File:** `frontend/src/features/sync/sync-screen.tsx`

**Connector (lines 132-157):** The moving dots (lines 142-148) animate with `motion.span` using `animate={{ x: "300%" }}` and `repeat: Infinity`. These must respect `prefers-reduced-motion`.

**What to change:**
- Line 147: Add a `useReducedMotion()` check from `framer-motion`/`motion`. Import `useReducedMotion` from `motion/react` (the project already uses `motion/react` — see `sync-screen.tsx:4` import). When reduced motion is preferred, skip the animation entirely: render static dots or a simple filled bar.
- Pseudo-code:
```tsx
const reduce = useReducedMotion();  // or import from motion/react
// Line 140-149:
{state === "active" && !reduce && [0,1,2].map(...full animation...)}
{state === "active" && reduce && <div className="absolute inset-0 bg-brand-200 rounded-full" />}
```
- **Fact check:** The app IS wrapped in `MotionProvider` (`app/providers.tsx:15`) which uses `MotionConfig reducedMotion="user"` (`motion/index.tsx:46`). Under `prefers-reduced-motion: reduce`, this suppresses transitions on child `motion.*` components.
- **However**, suppression causes `animate={{ x: "300%" }}` to render dots at their final (off-screen) position — invisible/broken UI, not a meaningful static fallback.
- **Recommendation:** Import `useReducedMotion` from `motion/react` (confirmed exported at `motion/index.tsx:3`). When reduced motion is preferred, render a static filled bar instead of the sliding dots:
```tsx
const reduce = useReducedMotion();
{state === "active" && !reduce && [0, 1, 2].map(/* full sliding animation */)}
{state === "active" && reduce && <div className="absolute inset-0 rounded-full bg-brand-200" />}
```
- Add `aria-hidden` to the individual `motion.span` dots (line 142) — they are decorative; the container already conveys status via `aria-label` (line 136).

### 5d. `admin-overview-screen.tsx`

**File:** `frontend/src/features/admin/admin-overview-screen.tsx`

| Line | Current | Token |
|---|---|---|
| 184, 189, 194, 199 | `rounded-xl bg-sunken p-4` (NetworkPanel metric cards) | `rounded-[var(--radius-lg)] bg-sunken p-4` (`--radius-lg` = 12px, `globals.css:65`) — `rounded-xl` is Tailwind default 0.75rem = 12px, matches. Replace for consistency: `rounded-[var(--radius-lg)]` |
| 230 | `h-80` (GeoPanel map container) | Use `h-80` is a fixed pixel height (20rem). Could introduce a token `--panel-map-height` in `globals.css` or accept `h-80` as a layout constant (not a design token). Audit says "hardcoded values." **Recommendation:** Define `--panel-map-height: 20rem` at the `@theme` block in `globals.css` and use `h-[var(--panel-map-height)]`. |
| 170 | `h-40` (Breakdown skeleton) | Same treatment: `Skeleton className="h-40 ..."` → `h-[var(--panel-chart-height)]` or just `rounded-[var(--radius-lg)]`. **Recommendation:** Use `rounded-[var(--radius-lg)]` (already has `rounded-xl` → same). The `h-40` is a height for chart skeleton; replace with `h-[var(--panel-chart-skeleton-h)]` defined as `10rem` in globals. Or simpler: leave height as a layout constant but ensure `rounded-[var(--radius-lg)]`. Since the audit flags `h-40`, define `--skeleton-chart-h: 10rem` and use `h-[var(--skeleton-chart-h)]`. |

**Gotcha:** The `Skeleton` component (`surface.tsx:140-150`) renders `animate-pulse`. Under `prefers-reduced-motion`, the global CSS (`globals.css:748-770`) disables the animation. Good — no extra work needed there.

### 5e. `reports-screen.tsx`

**File:** `frontend/src/features/reports/reports-screen.tsx`

| Line | Current | Token / Fix |
|---|---|---|
| 130 (in `field.tsx` FilterSelect) | `min-h-10 py-1.5 rounded-[10px]` | `rounded-[var(--radius-md)]` (`--radius-md` = 8px) — note `FilterSelect` lives in `field.tsx:124-137`, not `reports-screen.tsx`. The audit lists it under `reports-screen.tsx` because the screen imports it. Fix location: `field.tsx:130`. |
| 154, 163 | `size-8 rounded-md` (view toggle buttons) | `rounded-[var(--radius-sm)]` (`--radius-sm` = 6px; `rounded-md` is 0.375rem = 6px — matches). Replace for token consistency. |
| 193 | `ring-amber/40` (local report panel) | `ring-amber/40` is `rgb(243 182 106 / 0.4)` — `amber` resolves to `--color-amber`. This is already tokenized via Tailwind color name. **No change needed** — `amber` is a token alias. |
| 193 | `Panel variant="sunken" className="p-2 ring-1 ring-inset ring-amber/40"` | Already uses token alias. Leave as-is, or if strict, `ring-1 ring-inset ring-[var(--color-amber)/40]` — but Tailwind handles `ring-amber/40` correctly. No change. |

**Recommendation for FilterSelect:** Since `FilterSelect` is in `field.tsx:124-137`, fix it there: replace `rounded-[10px]` → `rounded-[var(--radius-md)]`.

**Effort:** S/M across all sub-items (token swaps, no structural changes)

---

## 6. SHOULD FIX — `use-keyboard-shortcuts.ts`: scope array + cross-platform normalization

**File:** `frontend/src/hooks/use-keyboard-shortcuts.ts`

### Problem
- Line 9: `scope?: "global" | "input"` — a string, not `string[]`. Line 29: `const allow = shortcuts.find((s) => s.scope === "input")` — only matches shortcuts with `scope === "input"`, and `find` returns the **first** match, meaning only ONE input-scope shortcut is ever honored.
- Line 33: The combo is built from `e.ctrlKey ? "ctrl" : ""` and `e.metaKey ? "meta" : ""` — no normalization. A shortcut defined as `keys: ["cmd", "k"]` won't match `ctrl+k` on Windows. Should normalize both to a canonical `"mod"`.

### What the final code should look like (pseudo-code)

```ts
interface ShortcutConfig {
  keys: string[];
  description: string;
  action: () => void;
  scope?: ("global" | "input")[];  // CHANGE: array
}
```

**Handler logic:**
```ts
function handler(e: KeyboardEvent) {
  if (isTyping(document.activeElement)) {
    // Collect ALL input-scope shortcuts
    const inputShortcuts = shortcuts.filter((s) => s.scope?.includes("input"));
    if (inputShortcuts.length === 0) return;
    // match against inputShortcuts instead of all shortcuts
    const match = inputShortcuts.find(/* same combo match */);
    if (match) { e.preventDefault(); match.action(); return; }
    return;
  }

  const match = shortcuts.find(/* combo match */);
  if (match) { e.preventDefault(); match.action(); }
}
```

**Combo normalization (lines 33-36):**
```ts
const combo = [
  e.ctrlKey || e.metaKey ? "mod" : "",
  e.shiftKey ? "shift" : "",
  e.altKey ? "alt" : "",
  e.key.toLowerCase(),
]
  .filter(Boolean)
  .sort()
  .join("+");
```

And normalize the shortcut definition too:
```ts
const normalizedKeys = s.keys
  .map((k) => (k === "cmd" || k === "ctrl" ? "mod" : k))
  .map((k) => k.toLowerCase())
  .sort()
  .join("+");
```

This way, `keys: ["mod", "k"]` (or equivalently `["cmd", "k"]` or `["ctrl", "k"]`) matches both Cmd+K (Mac) and Ctrl+K (Win/Linux). The existing callers in `app-shell.tsx:67-76` use plain letters like `["n"]`, `["g", "d"]`, `["?"]`, `["escape"]` — no modifier normalization needed for those, but the infrastructure should support it.

### Callers to check
- `app-shell.tsx:66-78`: passes shortcuts with `keys: ["n"]`, etc. — no `scope` specified (defaults to global behavior). No change needed in caller, but if any caller sets `scope: "input"`, change to `scope: ["input"]`.

### Gotchas
- Changing `scope` from `string` to `("global" | "input")[]` is a breaking type change. Verified callers:
  - `app-shell.tsx:66` — no `scope` property used in any shortcut object. Safe.
  - Grep across `frontend/src/**/*.tsx` confirms no other file imports or calls `useKeyboardShortcuts`. (Verified via grep: only `use-keyboard-shortcuts.ts` defines `scope`.)
  - Grep for `scope:` across the codebase to find other callers.
- The `useEffect` dependency array (`[shortcuts, ...deps]` on line 48) has an `eslint-disable` comment — keep it as-is since the hook intentionally re-subscribes on shortcut change.

**Effort:** S

---

## 7. NICE TO HAVE (lower priority)

### 7a. Page transition directionality

**File:** `frontend/src/components/motion/index.tsx` — `PageTransition` (line 125-136)

Currently always slides up + fades. To add directionality:
- Track navigation depth (push vs. pop) using `useRouter().events` or a custom stack.
- `PageTransition` would accept a `direction: "forward" | "backward"` prop.
- "Forward" (navigate deeper): slide left-out, slide right-in.
- "Backward" (navigate up/popping): slide right-out, slide left-in.
- **Implementation:** Use `initial/direction`-based variants:
```tsx
const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 20 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -dir * 20 }),
};
```
- Requires a global nav-direction tracker (e.g., a context that increments/decrements on push/pop). **Risk:** `next/navigation` in Next 16 — verify the router event API. The `useRouter()` from `next/navigation` (app router) does NOT expose `events` like `next/router` did. Alternative: use `useEffect` + `usePathname` to detect push vs. pop, or store a history stack in a ref.

**Effort:** M (requires a custom direction tracker — non-trivial in App Router)

### 7b. Focus-visible rings on link-based cards

**Files:**
- `frontend/src/features/reports/report-row.tsx:67-71` — `ReportRow` with `href` renders a `<Link>`. The `className` (line 66) includes `press-lift` but no explicit `focus-visible` ring.
- `frontend/src/features/reports/report-card.tsx:59-65, 67-72` — `ReportCard` with `href` renders a `<Link>`. `card` className has no focus ring.
- `frontend/src/components/ui/surface.tsx:95-138` — `StatCard` wraps in a `Link` (when used with `href`) — see `admin-overview-screen.tsx:90` which wraps `StatCard` in a `<Link>`.

**What to change:**
- `ReportRow`: Add `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/35` to the `className` (line 66). Since the `<Link>` wraps the whole row, the ring appears on the row.
- `ReportCard`: Add same to the `card` cx string (line 60-65).
- `StatCard`: The `StatCard` component itself (`surface.tsx:117`) doesn't render a `<Link>` — it's the `admin-overview-screen.tsx:90` `<Link>` wrapper that needs the ring. Add focus styles to the wrapper Link, or pass through. **Recommendation:** Add `focus-visible:ring-[3px] focus-visible:ring-brand-500/35` to the `<Link>` on `admin-overview-screen.tsx:90`.

Actually, `ReportCard` with `href` already has `cursor-pointer` but no focus ring — the `group` hover effect doesn't produce a ring. Add explicit `focus-visible` ring.

**Effort:** S

### 7c. Branded Leaflet tile + pin styling

Partially covered by fix #3 (branded divIcon pin). For the tile layer, the `globals.css:653-676` already has Leaflet CSS overrides. The tile layer URL uses OSM tiles. No change needed beyond what #3 does.

### 7d. Loading skeleton for `LocationPicker`

The `LocationPicker` wrapper (`location-picker.tsx:53-58`) already renders a `"Loading map…"` placeholder during SSR/early mount. The audit's nice-to-have mentions it, but it's already implemented. **Note:** The `LocationPickerMap` level (fix #3) should also show a tile-loading overlay (the `tilesLoaded` state). This is covered by fix #3.

**Effort:** Already done at wrapper level; covered by #3 for tile level.

---

## 8. Implementation Order & Dependencies

```
1. Fix #4 (--duration-micro) — XS, no dependencies. Do FIRST as it's referenced everywhere.
2. Fix #2 (pdf-generator tokens) — S, standalone. Do early.
3. Fix #1 (report-form floating labels) — M, depends on #4 (motion tokens used in validation animation).
4. Fix #3 (location-picker-map) — M, standalone. Can run after #1.
5. Fix #5 (hardcoded values) — S/M, spans multiple files. Do after #4 (duration).
   5a → 5e can be done in any order; batch as one PR.
6. Fix #6 (keyboard shortcuts) — S, standalone.
7. Fix #7 (nice-to-haves) — M, depends on #3 (map pin) and #5 (focus rings on cards).
```

### Suggested PR grouping:
- **PR 1 (Foundations):** #4 (duration) + #5 (token cleanup, all files)
- **PR 2 (Core forms):** #1 (report-form floating labels)
- **PR 3 (Map accessibility):** #3 (location-picker-map)
- **PR 4 (UX infrastructure):** #6 (keyboard shortcuts) + #7 (focus rings, page transitions)
- **PR 5 (Standalone):** #2 (pdf-generator)

---

## 9. Verification Checklist

### For all fixes:
- [ ] `npx tsc --noEmit` passes (TypeScript)
- [ ] `npx eslint` passes (ESLint)
- [ ] `npx tailwindcss -i src/app/globals.css --check` (if available) or eyeball for Tailwind v4 class issues
- [ ] No new `any` types introduced

### Fix #1 — report-form.tsx
- [ ] `FloatingLabelInput` and `FloatingLabelTextarea` imported from `@/components/ui` (barrel re-exports them — `index.ts:43-53`)
- [ ] All 6 target fields use floating-label components; no `Field`+`Input`/`Textarea`/`Select` wrappers remain for those fields
- [ ] `conditionName` shows live character count (120), `symptoms` shows live count (600), `notes` shows count (2000 via `characterCount`)
- [ ] `aria-invalid` set on the underlying input when `error` prop is passed (`form.tsx:626`)
- [ ] `placeholder=" "` drives floating label (label floats up when focused or filled)
- [ ] `register("field")` still works — form submission and validation unchanged
- [ ] No console errors about `id` prop conflicts (FloatingLabel* hardcode `id={name}`)
- [ ] Visual check: label floats, error animates in, character count color turns red on overflow

### Fix #2 — pdf-generator.ts
- [ ] `:root` block defines all token values used in the template
- [ ] All hardcoded hex colors replaced with `var(--...)`
- [ ] `font-family: var(--font-sans)` in body
- [ ] PDF still opens and prints (manual check: open in new tab, verify gradient uses brand-900→brand-600)
- [ ] Print dialog shows correct font fallback

### Fix #3 — location-picker-map.tsx
- [ ] Map container `<div>` has `tabIndex={0}`
- [ ] Arrow keys pan the map (Up/Down/Left/Right by ~40px)
- [ ] `+`/`-` keys zoom in/out
- [ ] `focus-visible:ring-[3px] focus-visible:ring-brand-500/35` visible when tabbing to map
- [ ] Zoom control buttons visible (click +/- to zoom)
- [ ] Pin is a branded SVG (green, matches brand-600) not the yellow Leaflet default
- [ ] Tile loading overlay appears while tiles download, disappears when loaded
- [ ] No memory leak from map ref cleanup

### Fix #4 — duration mismatch
- [ ] `DURATION.micro === 0.14` in `motion/index.tsx:15`
- [ ] `--duration-micro: 140ms` in `globals.css:115`
- [ ] Grep: no remaining `0.16` in motion constants, no `160ms` duration tokens

### Fix #5 — hardcoded values
- [ ] `app-shell.tsx:95` sidebar shadow uses `var(--shadow-*)`
- [ ] `app-shell.tsx:338` TabBar dock uses `var(--radius-2xl)`
- [ ] `app-shell.tsx:292, 413` UserMenu/MoreSheet use `var(--radius-xl)`
- [ ] `sections.tsx` HeatIllustration colors use `var(--color-*)`
- [ ] `sections.tsx` HowItWorks line SVG strokes use `var(--color-*)` + `stroke-opacity`
- [ ] `sync-screen.tsx` Connector respects `prefers-reduced-motion` (no infinite animation when reduced)
- [ ] `admin-overview-screen.tsx:184` NetworkPanel cards use `var(--radius-lg)`
- [ ] `admin-overview-screen.tsx:170` Breakdown skeleton uses token height
- [ ] `admin-overview-screen.tsx:230` GeoPanel height uses token or consistent constant
- [ ] `field.tsx:130` FilterSelect uses `var(--radius-md)`
- [ ] `reports-screen.tsx:154,163` view toggle uses `var(--radius-sm)`

### Fix #6 — keyboard shortcuts
- [ ] `scope` type allows `("global" | "input")[]`
- [ ] Multiple `scope: ["input"]` shortcuts can coexist
- [ ] `modKey` normalization: `["mod", "k"]` matches both Cmd+K and Ctrl+K
- [ ] Existing `app-shell.tsx` shortcuts (letter keys, no modifiers) still work
- [ ] `Ctrl/Cmd+K` opens help (if added) without conflict

### Fix #7 (nice-to-haves)
- [ ] ReportRow, ReportCard, StatCard links show focus-visible ring on keyboard focus
- [ ] Page transitions have directional slide (if implemented)
- [ ] Map pin is branded (covered by #3)

---

## 10. Risks & Gotchas (Consolidated)

| Risk | Where | Mitigation |
|---|---|---|
| **Tailwind v4 arbitrary value syntax** | All files using `shadow-[...]`, `rounded-[...]` | In v4, arbitrary values with `var()` are supported: `rounded-[var(--radius-xl)]`. Verify with `tailwindcss` build. Hex with underscores (`rgb(11_61_53/0.18)`) works in v4. |
| **`next/dynamic` SSR in map** | `location-picker.tsx:23` | Already handled with `ssr: false`. Any new map component code must also be browser-only. |
| **SVG `fill="var(--color-*)"`** | `sections.tsx` HeatIllustration | CSS variables in SVG presentation attributes work in modern browsers. Fallback to inline hex is an option if needed. |
| **`react-hook-form` register + FloatingLabelInput prop collisions** | `report-form.tsx` | `FloatingLabelInput` destructures its own props and spreads `...props` onto `<input>`. `register()` props (`onChange`, `onBlur`, `ref`, `name`) all pass through. `name` is consumed by the component — no conflict since `register` uses the same string. |
| **FloatingLabelInput hardcodes `id={name}`** | `form.tsx:623` | Must remove explicit `id=` from migrated fields to avoid React `id` prop conflicts. |
| **`peer-placeholder-shown` dependency** | `form.tsx:593` | Floating labels rely on the input rendering `placeholder=" "`. Do not pass a visible placeholder. |
| **framer-motion `useReducedMotion` import** | `sync-screen.tsx` | Import from `motion/react` (the project uses `motion/react` not `framer-motion` directly — see `sync-screen.tsx:4`, `motion/index.tsx:3`). Verify `useReducedMotion` is exported from the `motion` package. |
| **`MotionConfig reducedMotion="user"`** | `motion/index.tsx:46` | If `sync-screen.tsx` is rendered under `MotionProvider`, `motion.*` children already respect reduced motion. Verify the provider wraps the app. If not, add explicit `useReducedMotion`. |
| **react-leaflet v5 ref API** | `location-picker-map.tsx` | v5 uses `ref` on `MapContainer` to get the `L.Map` instance. `whenCreated` was removed. Verify the correct API for the installed `react-leaflet@5.0.0`. |
| **`prefers-reduced-motion` global override** | `globals.css:748-770` | The global `@media (prefers-reduced-motion: reduce)` already disables CSS transitions/animations. Framer-motion `motion.*` components need `reducedMotion="user"` on `MotionConfig` or `useReducedMotion()` for JS-driven animations (Connector dots). |
| **Popup window CSS variable inheritance** | `pdf-generator.ts` | Popup is a separate document — define `:root` block with token values. Not automatically synced with `globals.css` changes. Consider runtime injection as follow-up. |
| **Color contrast (WCAG AA)** | All | `globals.css:4-10` states all text pairs meet AA. When changing colors to tokens, ensure the new combinations also meet AA. Especially important for `--color-amber` text on backgrounds. |

---

## 11. Effort Summary

| # | Fix | Effort |
|---|---|---|
| 1 | report-form floating labels | M |
| 2 | pdf-generator tokens | S |
| 3 | location-picker-map accessibility | M |
| 4 | duration-micro mismatch | XS |
| 5 | hardcoded values (5a-5e) | S/M |
| 6 | keyboard shortcuts | S |
| 7 | page transitions / focus rings | S/M |
| **Total** | | **~M** (2-3 dev days) |

---

## 12. Token Mapping Cheat Sheet

| Hardcoded value | Token |
|---|---|
| `#0b3d2e` | `--color-brand-900` |
| `#0b3d35` | `--color-brand-900` |
| `#146c5a` | `--color-brand-600` |
| `#1f6b4f` | `--color-brand-500` |
| `#1d8a70` | `--color-brand-500` |
| `#21865a` | `--color-success` |
| `#c43d4b` | `--color-error` |
| `#f3b66a` | `--color-amber` |
| `#80cfb1` | `--color-brand-300` |
| `#52606d` | `--color-muted` |
| `#172522` | `--color-ink` |
| `#e6ece8` | `--color-line` |
| `#cfdad4` | `--color-line-strong` |
| `#ffffff` | `--color-surface` |
| `10px` radius | `--radius-lg` (8px) or `--radius-sm` (6px) — decide per context |
| `140ms` | `--duration-micro` |
| `0.16s` | → should be `0.14s` (fix #4) |
| `252px / 16px` | `--radius-xl` (16px) / `--radius-2xl` (22px) |

---

*End of plan. No code written.*