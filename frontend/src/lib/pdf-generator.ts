// Branded PDF generator. Zero dependencies: the browser prints a styled page
// and the user saves it as PDF from the print dialog. This keeps full control
// over the AfyaLink look without pulling in a PDF library that would also need
// server-side rendering.
//
// The print window is a separate document, so it cannot read the app's CSS
// variables; the values below mirror the tokens in `app/globals.css` (and the
// validated chart palette) and must be kept in sync by hand.

export interface PdfMeta {
  title: string;
  subtitle?: string;
  /** Short label for the document type, shown as a pill (e.g. "Reports export"). */
  kind?: string;
  generatedAt: string;
  generatedBy: string;
  role: string;
}

/** Severity and review states get coloured chips (always with their text label). */
export type PdfTone = "low" | "moderate" | "high" | "critical" | "submitted" | "reviewed" | "actioned" | "pending" | "neutral";

export type PdfCell = string | { text: string; tone?: PdfTone };

export interface PdfColumn {
  label: string;
  align?: "left" | "right";
  /** CSS width, e.g. "14%". */
  width?: string;
}

export interface PdfStat {
  label: string;
  value: string;
  hint?: string;
  /** Colours the tile's accent (e.g. "critical" for an urgent count). */
  tone?: PdfTone;
}

export interface PdfBar {
  label: string;
  value: number;
  tone?: PdfTone;
}

interface SectionBase {
  heading: string;
  description?: string;
}

/** Key/value details. Long values (over ~80 characters) and lone rows span the full width. */
export interface PdfRowsSection extends SectionBase {
  rows: Array<{ label: string; value: string }>;
}
export interface PdfStatsSection extends SectionBase {
  stats: PdfStat[];
}
export interface PdfTableSection extends SectionBase {
  table: {
    columns: PdfColumn[];
    rows: PdfCell[][];
    empty?: string;
    /** Per-row colour stripe on the left edge (e.g. each report's severity). */
    rowTones?: PdfTone[];
    /** Colour key shown above the table. */
    legend?: Array<{ text: string; tone: PdfTone }>;
  };
}
export interface PdfBarsSection extends SectionBase {
  bars: PdfBar[];
  unit?: string;
}

export type PdfSection = PdfRowsSection | PdfStatsSection | PdfTableSection | PdfBarsSection;

/** The browser refused to open the print window (usually a pop-up blocker). */
export class PopupBlockedError extends Error {
  constructor() {
    super("Your browser blocked the PDF window. Allow pop-ups for AfyaLink and try again.");
    this.name = "PopupBlockedError";
  }
}

/**
 * Opens the print window. Call it synchronously inside the click handler,
 * before any `await`: browsers only allow pop-ups during the user's gesture,
 * so a window opened after a network request is silently blocked. Shows a
 * "Preparing" page until `writePrintablePdf` fills it in.
 */
export function openPrintWindow(): Window {
  // No "noopener" feature here: with it, window.open() always returns null and
  // we could not write the document. Sever the back-reference by hand instead.
  const win = window.open("", "_blank");
  if (!win) throw new PopupBlockedError();
  win.opener = null;
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preparing PDF…</title></head>' +
      '<body style="font-family:system-ui,sans-serif;color:#687873;background:#eef2ef;display:grid;place-items:center;min-height:90vh;margin:0">Preparing your PDF…</body></html>',
  );
  win.document.close();
  return win;
}

/**
 * Opens a print window with a branded document. The user saves it as PDF from
 * the OS print dialog. Throws PopupBlockedError if the window could not be opened.
 */
export function openPrintablePdf(meta: PdfMeta, sections: PdfSection[], filename?: string): void {
  writePrintablePdf(openPrintWindow(), meta, sections, filename);
}

/** Writes the branded document into a window from `openPrintWindow` and prints it. */
export function writePrintablePdf(win: Window, meta: PdfMeta, sections: PdfSection[], filename?: string): void {
  if (win.closed) return;
  win.document.open();
  win.document.write(renderPdfHtml(meta, sections));
  win.document.close();
  // The print dialog suggests the title as the file name.
  if (filename) win.document.title = filename;
  win.focus();
  // `load` does not reliably fire again when an open window's document is
  // rewritten, so give it a moment to paint, then prompt.
  window.setTimeout(() => {
    if (!win.closed) win.print();
  }, 350);
}

// ---------------------------------------------------------------------------
// Rendering (pure: exported for tests)
// ---------------------------------------------------------------------------

const TONES: Record<PdfTone, { fg: string; bg: string; dot: string }> = {
  low: { fg: "#3f6212", bg: "#eef6e4", dot: "#4d7c0f" },
  moderate: { fg: "#92400e", bg: "#fdf1df", dot: "#b45309" },
  high: { fg: "#9a3412", bg: "#fde9dd", dot: "#c2410c" },
  critical: { fg: "#991b1b", bg: "#fbe4e4", dot: "#b91c1c" },
  submitted: { fg: "#3d4a47", bg: "#eff4f1", dot: "#687873" },
  reviewed: { fg: "#1d4f84", bg: "#e4eef9", dot: "#22609f" },
  actioned: { fg: "#155a3c", bg: "#ddf5ea", dot: "#1a6e4a" },
  pending: { fg: "#85560f", bg: "#fdf1df", dot: "#d08a1c" },
  neutral: { fg: "#3d4a47", bg: "#eff4f1", dot: "#9aa9a4" },
};

/** Bars share the chips' colour codes, so severity reads the same everywhere on the page. */
const BAR_COLORS: Partial<Record<PdfTone, string>> = {
  low: "#4d7c0f",
  moderate: "#d08a1c",
  high: "#c2410c",
  critical: "#b91c1c",
  submitted: "#5fb998",
  reviewed: "#2a8f72",
  actioned: "#0f5245",
};

const LOGO_SVG = `<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#ffffff"/><g transform="rotate(-45 16 16)" fill="none" stroke-width="2.6"><rect x="5" y="12.6" width="13" height="6.8" rx="3.4" stroke="#146c5a"/><rect x="14" y="12.6" width="13" height="6.8" rx="3.4" stroke="#3fae8c"/></g><circle cx="24.6" cy="7.4" r="2.6" fill="#f3b66a"/></svg>`;

/** The AfyaLink honeycomb as tiling data URIs (the print window has no assets). */
const hexTile = (stroke: string, opacity: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0l28 16v32L28 64 0 48V16zM28 64l28 16v32M28 64L0 80v32' fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1.2'/%3E%3C/svg%3E")`;
const HEX_PATTERN = hexTile("%23ffffff", 0.13);
const PAGE_PATTERN = hexTile("%23146c5a", 0.1);

/** A cluster of filled hexagons for the header's right side, like the app's honeycomb background. */
function hexCluster(): string {
  const hex = (cx: number, cy: number, r: number, fill: string, opacity: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="${fill}" fill-opacity="${opacity}"/>`;
  };
  return `<svg class="hex-cluster" viewBox="0 0 220 180" aria-hidden="true">${[
    hex(150, 40, 26, "#9fe3c8", 0.16),
    hex(195, 66, 26, "#9fe3c8", 0.1),
    hex(150, 92, 26, "#3fae8c", 0.22),
    hex(105, 66, 26, "#9fe3c8", 0.08),
    hex(195, 118, 26, "#f3b66a", 0.28),
    hex(150, 144, 26, "#9fe3c8", 0.1),
    hex(60, 92, 18, "#9fe3c8", 0.06),
  ].join("")}</svg>`;
}

function chip(cell: { text: string; tone?: PdfTone }): string {
  const tone = TONES[cell.tone ?? "neutral"];
  return `<span class="chip" style="color:${tone.fg};background:${tone.bg}"><i style="background:${tone.dot}"></i>${escapeHtml(cell.text)}</span>`;
}

function cellHtml(cell: PdfCell): string {
  return typeof cell === "string" ? escapeHtml(cell) : cell.tone ? chip(cell) : escapeHtml(cell.text);
}

function renderSection(section: PdfSection, index: number): string {
  const head = `<header class="sec-head"><span class="sec-num">${String(index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(section.heading)}</h2>${
    section.description ? `<p>${escapeHtml(section.description)}</p>` : ""
  }</div></header>`;

  if ("stats" in section) {
    const tiles = section.stats
      .map(
        (s) =>
          `<div class="stat"${s.tone ? ` style="--accent:${TONES[s.tone].dot}"` : ""}><span class="stat-label">${escapeHtml(s.label)}</span><span class="stat-value">${escapeHtml(s.value)}</span>${
            s.hint ? `<span class="stat-hint">${escapeHtml(s.hint)}</span>` : ""
          }</div>`,
      )
      .join("");
    return `<section class="sec">${head}<div class="stats" style="--cols:${Math.min(4, Math.max(1, section.stats.length))}">${tiles}</div></section>`;
  }

  if ("bars" in section) {
    const total = section.bars.reduce((sum, b) => sum + b.value, 0);
    const max = Math.max(1, ...section.bars.map((b) => b.value));
    const unit = section.unit ?? "";
    const rows = section.bars
      .map((b) => {
        const pct = total ? Math.round((b.value / total) * 100) : 0;
        const color = (b.tone && BAR_COLORS[b.tone]) || "#0b8f72";
        return `<div class="bar-row"><span class="bar-label">${escapeHtml(b.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${b.value ? Math.max(2, (b.value / max) * 100) : 0}%;background:${color}"></span></span><span class="bar-value"><b>${b.value.toLocaleString()}</b>${unit ? ` ${escapeHtml(unit)}` : ""} <em>${pct}%</em></span></div>`;
      })
      .join("");
    return `<section class="sec">${head}<div class="bars">${rows}</div></section>`;
  }

  if ("table" in section) {
    const { columns, rows, empty, rowTones, legend } = section.table;
    const colgroup = columns.map((c) => `<col${c.width ? ` style="width:${c.width}"` : ""}>`).join("");
    const thead = columns.map((c) => `<th${c.align === "right" ? ' class="r"' : ""}>${escapeHtml(c.label)}</th>`).join("");
    const body = rows.length
      ? rows
          .map(
            (row, r) =>
              `<tr${rowTones?.[r] ? ` style="--row:${TONES[rowTones[r]].dot}"` : ""}>${row.map((cell, i) => `<td${columns[i]?.align === "right" ? ' class="r"' : ""}>${cellHtml(cell)}</td>`).join("")}</tr>`,
          )
          .join("")
      : `<tr><td class="empty" colspan="${columns.length}">${escapeHtml(empty ?? "Nothing to show.")}</td></tr>`;
    const key = legend?.length ? `<div class="legend"><span>Key</span>${legend.map(chip).join("")}</div>` : "";
    return `<section class="sec sec-table">${head}${key}<table><colgroup>${colgroup}</colgroup><thead><tr>${thead}</tr></thead><tbody>${body}</tbody></table></section>`;
  }

  const items = section.rows
    .map(
      (r) =>
        `<div class="kv${r.value.length > 80 || section.rows.length === 1 ? " wide" : ""}"><dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd></div>`,
    )
    .join("");
  return `<section class="sec">${head}<dl class="kvs">${items}</dl></section>`;
}

export function renderPdfHtml(meta: PdfMeta, sections: PdfSection[]): string {
  const metaCells = [
    ["Generated", meta.generatedAt],
    ["Prepared by", meta.generatedBy],
    ["Role", meta.role],
  ]
    .map(([k, v]) => `<div><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`)
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(meta.title)}</title>
<style>
  :root {
    --ink: #172522; --muted: #687873; --line: #e3eae6; --sunken: #f3f6f4;
    --brand-950: #072a24; --brand-900: #0b3d35; --brand-700: #10584a; --brand-600: #146c5a;
    --mint: #ddf5ea; --amber: #f3b66a;
    --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: var(--font); color: var(--ink); background: #e8ede9; font-size: 11px; line-height: 1.5; }

  /* Screen preview: an A4 sheet with a toolbar. Print: just the sheet. */
  .toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px; background: rgba(255,255,255,.88); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); font-size: 12.5px; color: var(--muted); }
  .toolbar button { font: inherit; font-weight: 600; color: #fff; background: var(--brand-600); border: 0; border-radius: 10px; padding: 8px 14px; cursor: pointer; }
  .toolbar button:hover { background: var(--brand-700); }
  .sheet { position: relative; width: 210mm; min-height: 297mm; margin: 22px auto 40px; padding: 14mm 14mm 16mm; background: #fff; border-radius: 6px; box-shadow: 0 1px 2px rgb(38 57 77 / .06), 0 24px 60px -24px rgb(38 57 77 / .35); }
  /* Faint honeycomb behind the top of the first page, fading out. */
  .sheet::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 120mm; background: ${PAGE_PATTERN}; -webkit-mask-image: linear-gradient(180deg, #000 0%, transparent 100%); mask-image: linear-gradient(180deg, #000 0%, transparent 100%); pointer-events: none; }
  .sheet > * { position: relative; }

  @page { size: A4; margin: 12mm 12mm 16mm; @bottom-left { content: "AfyaLink · Synthetic data · Academic prototype"; font: 8.5px var(--font); color: #8a9793; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8.5px var(--font); color: #8a9793; } }
  /* Phones and narrow windows: the on-screen preview reflows (print stays A4). */
  @media screen and (max-width: 820px) {
    body { font-size: 12px; }
    .toolbar { padding: 8px 12px; font-size: 11.5px; }
    .toolbar span { display: none; }
    .toolbar button { width: 100%; padding: 11px 14px; font-size: 14px; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 14px 12px 24px; border-radius: 0; box-shadow: none; }
    .hero { padding: 16px; border-radius: 14px; }
    .hero h1 { font-size: 21px; margin-top: 16px; }
    .hex-cluster { width: 160px; height: 130px; opacity: .8; }
    .hero-meta { grid-template-columns: 1fr; }
    .stats { grid-template-columns: repeat(2, 1fr); }
    .kvs { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 74px 1fr 78px; gap: 8px; }
    .legend { margin-left: 0; }
    .sec-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .sec-table table { min-width: 560px; }
  }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
    .sheet::before { inset: -12mm -12mm auto -12mm; }
  }

  /* Header band */
  .hero { position: relative; overflow: hidden; border-radius: 16px; padding: 20px 22px 18px; color: #fff; background: ${HEX_PATTERN}, radial-gradient(120% 140% at 100% 0%, #1d8a70 0%, transparent 55%), linear-gradient(135deg, var(--brand-950) 0%, var(--brand-900) 45%, var(--brand-700) 100%); }
  .hero::after { content: ""; position: absolute; right: -40px; bottom: -60px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgb(243 182 106 / .28), transparent 70%); }
  .hex-cluster { position: absolute; right: -6px; top: -8px; width: 230px; height: 190px; pointer-events: none; }
  .hero-top, .hero h1, .hero .sub, .hero-meta { position: relative; z-index: 1; }
  .hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
  .brand em { font-style: normal; color: #9fe3c8; }
  .kind { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; padding: 5px 10px; border-radius: 999px; background: rgb(255 255 255 / .12); border: 1px solid rgb(255 255 255 / .22); }
  .hero h1 { position: relative; z-index: 1; margin: 22px 0 4px; font-size: 25px; line-height: 1.15; font-weight: 750; letter-spacing: -0.025em; }
  .hero .sub { position: relative; z-index: 1; margin: 0; font-size: 12px; color: #cfeee2; }
  .hero-meta { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 18px; border-radius: 10px; overflow: hidden; background: rgb(255 255 255 / .14); }
  .hero-meta div { padding: 8px 11px; background: rgb(7 42 36 / .55); }
  .hero-meta span { display: block; font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase; color: #9fcfbd; }
  .hero-meta b { display: block; margin-top: 1px; font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Sections */
  .sec { margin-top: 22px; break-inside: avoid; }
  .sec-table { break-inside: auto; }
  .sec-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; break-after: avoid; }
  /* Section numbers wear the brand hexagon. */
  .sec-num { flex: none; display: grid; place-items: center; width: 26px; height: 28px; font-size: 9.5px; font-weight: 700; color: #fff; background: linear-gradient(160deg, var(--brand-600), var(--brand-900)); clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); }
  .sec-head h2 { margin: 1px 0 0; font-size: 14px; line-height: 1.25; font-weight: 700; letter-spacing: -0.01em; }
  .sec-head p { margin: 2px 0 0; font-size: 10.5px; color: var(--muted); text-align: justify; hyphens: auto; }

  .stats { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 8px; }
  .stat { position: relative; padding: 11px 12px 10px; border: 1px solid var(--line); border-radius: 12px; background: linear-gradient(180deg, #fff, #fafcfb); overflow: hidden; }
  .stat::before { content: ""; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent, var(--brand-600)); }
  /* A corner of honeycomb on each tile. */
  .stat::after { content: ""; position: absolute; right: -18px; top: -30px; width: 84px; height: 84px; background: ${PAGE_PATTERN}; background-size: 28px 48.5px; opacity: .9; -webkit-mask-image: radial-gradient(circle at 70% 30%, #000, transparent 70%); mask-image: radial-gradient(circle at 70% 30%, #000, transparent 70%); }
  .stat-value { color: var(--accent, var(--ink)); }
  .stat-label { display: block; font-size: 9px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .stat-value { display: block; margin-top: 3px; font-size: 22px; font-weight: 750; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .stat-hint { display: block; font-size: 9.5px; color: var(--muted); }

  .kvs { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; margin: 0; border-top: 1px solid var(--line); }
  .kv { padding: 8px 0; border-bottom: 1px solid var(--line); break-inside: avoid; }
  .kv.wide { grid-column: 1 / -1; }
  .kv dt { font-size: 9px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .kv dd { margin: 2px 0 0; font-size: 11.5px; font-weight: 500; white-space: pre-wrap; overflow-wrap: anywhere; }
  .kv.wide dd { text-align: justify; hyphens: auto; line-height: 1.6; }

  .bars { display: grid; gap: 7px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: linear-gradient(180deg, #fff, #fafcfb); }
  .bar-row { display: grid; grid-template-columns: 92px 1fr 92px; align-items: center; gap: 10px; }
  .bar-label { font-size: 10.5px; font-weight: 500; }
  .bar-track { height: 9px; border-radius: 999px; background: var(--sunken); overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 999px; }
  .bar-value { text-align: right; font-size: 10px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .bar-value b { color: var(--ink); font-weight: 700; }
  .bar-value em { font-style: normal; margin-left: 4px; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; table-layout: fixed; }
  thead { display: table-header-group; }
  th { padding: 7px 9px; text-align: left; font-size: 8.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--muted); background: var(--sunken); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  th:first-child { border-left: 1px solid var(--line); border-top-left-radius: 9px; }
  th:last-child { border-right: 1px solid var(--line); border-top-right-radius: 9px; }
  td { padding: 7px 9px; border-bottom: 1px solid var(--line); vertical-align: middle; overflow-wrap: anywhere; }
  td:first-child { border-left: 1px solid var(--line); box-shadow: inset 3px 0 0 var(--row, transparent); padding-left: 12px; }
  th:first-child { padding-left: 12px; }
  .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: -2px 0 9px 36px; }
  .legend > span:first-child { font-size: 8.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-right: 2px; }
  td:last-child { border-right: 1px solid var(--line); }
  tr { break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #fbfcfb; }
  tbody tr:last-child td:first-child { border-bottom-left-radius: 9px; }
  tbody tr:last-child td:last-child { border-bottom-right-radius: 9px; }
  .r { text-align: right; font-variant-numeric: tabular-nums; }
  td.empty { padding: 18px; text-align: center; color: var(--muted); }
  .chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px 2px 6px; border-radius: 999px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
  .chip i { width: 6px; height: 6px; border-radius: 50%; }

  .note { display: flex; gap: 10px; align-items: flex-start; margin-top: 24px; padding: 11px 13px; border-radius: 12px; background: ${PAGE_PATTERN} right -20px top -40px / 34px 59px no-repeat, #f3faf6; border: 1px solid #d5ece1; font-size: 10px; color: #3d5a52; break-inside: avoid; }
  .note span { text-align: justify; hyphens: auto; }
  .note svg { flex: none; margin-top: 1px; }
</style></head><body>
  <div class="toolbar"><span>Preview · use <b>Save as PDF</b> as the destination in the print dialog.</span><button type="button" onclick="window.print()">Save as PDF</button></div>
  <main class="sheet">
    <header class="hero">
      ${hexCluster()}
      <div class="hero-top"><div class="brand">${LOGO_SVG}<span>Afya<em>Link</em></span></div>${meta.kind ? `<span class="kind">${escapeHtml(meta.kind)}</span>` : ""}</div>
      <h1>${escapeHtml(meta.title)}</h1>
      ${meta.subtitle ? `<p class="sub">${escapeHtml(meta.subtitle)}</p>` : ""}
      <div class="hero-meta">${metaCells}</div>
    </header>
    ${sections.map(renderSection).join("")}
    <aside class="note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#146c5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg><span>Generated by AfyaLink, an academic prototype. Data is synthetic and not connected to any national health information system. Handle printed copies as confidential health information.</span></aside>
  </main>
</body></html>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
