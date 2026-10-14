// Branded PDF generator. Zero dependencies: the browser prints a styled page
// and the user saves it as PDF from the print dialog. This keeps full control
// over the AfyaLink look (forest green header, consistent shadows) without
// pulling in a PDF library that would also need server-side rendering.

export interface PdfMeta {
  title: string;
  subtitle?: string;
  generatedAt: string;
  generatedBy: string;
  role: string;
}

export interface PdfSection {
  heading: string;
  rows: Array<{ label: string; value: string }>;
}

/**
 * Opens a print window with a branded document. The user saves it as PDF from
 * the OS print dialog. This is intentional: it keeps the branding (forest green
 * header, consistent shadows) under our control without a PDF library.
 */
export function openPrintablePdf(meta: PdfMeta, sections: PdfSection[], filename?: string): void {
  if (typeof window === "undefined") return;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;

  const rows = sections
    .map(
      (s) => `
        <h2 style="margin:24px 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#0b3d2e;">${escapeHtml(s.heading)}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          ${s.rows
            .map(
              (r) => `<tr><td style="padding:6px 10px 6px 0;color:#52606d;border-bottom:1px solid #e6ece8;vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:6px 0;border-bottom:1px solid #e6ece8;color:#172522;white-space:pre-wrap;">${escapeHtml(r.value)}</td></tr>`,
            )
            .join("")}
        </table>`,
    )
    .join("");

  if (filename) win.document.title = filename;

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.title)}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #172522; }
  .brand-bar { background: linear-gradient(135deg, #0b3d2e 0%, #1f6b4f 100%); color: #fff; padding: 18px 22px; border-radius: 10px; }
  .brand-bar h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .brand-bar p { margin: 4px 0 0; font-size: 12px; opacity: .85; }
  .meta { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin: 14px 0 4px; font-size: 11px; color:#52606d; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e6ece8; font-size: 10px; color:#8a9793; }
</style></head><body>
  <div class="brand-bar">
    <h1>AfyaLink</h1>
    <p>${escapeHtml(meta.subtitle || meta.title)}</p>
  </div>
  <div class="meta">
    <div>Generated: ${escapeHtml(meta.generatedAt)}</div>
    <div>By: ${escapeHtml(meta.generatedBy)} (${escapeHtml(meta.role)})</div>
  </div>
  ${rows}
  <div class="footer">AfyaLink · Academic prototype · Synthetic data, not connected to any national health information system.</div>
</body></html>`);
  win.document.close();
  win.focus();
  // Give the browser a tick to paint before prompting the print dialog.
  setTimeout(() => win.print(), 250);
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}