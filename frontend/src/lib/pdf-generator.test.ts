import { renderPdfHtml, type PdfMeta } from "./pdf-generator";

const meta: PdfMeta = { title: "Reports", kind: "Reports export", generatedAt: "16 Oct 2026", generatedBy: "Demo Admin", role: "Administrator" };

describe("renderPdfHtml", () => {
  it("escapes every user-supplied string, including in tables and chips", () => {
    const html = renderPdfHtml({ ...meta, title: "<script>alert(1)</script>" }, [
      { heading: "Details", rows: [{ label: "Notes", value: `"><img src=x onerror=alert(1)>` }] },
      { heading: "Reports", table: { columns: [{ label: "Condition" }, { label: "Severity" }], rows: [["<b>x</b>", { text: "<i>High</i>", tone: "high" }]] } },
    ]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;i&gt;High&lt;/i&gt;");
  });

  it("renders stat tiles, distribution bars with shares, and numbered sections", () => {
    const html = renderPdfHtml(meta, [
      { heading: "At a glance", stats: [{ label: "Reports", value: "26" }] },
      { heading: "Severity mix", unit: "reports", bars: [{ label: "Low", value: 1, tone: "low" }, { label: "High", value: 3, tone: "high" }] },
    ]);
    expect(html).toContain('class="stat-value">26<');
    expect(html).toContain("25%");
    expect(html).toContain("75%");
    expect(html).toContain('class="sec-num">01<');
    expect(html).toContain('class="sec-num">02<');
    expect(html).toContain("Reports export");
  });

  it("shows the empty message for a table without rows", () => {
    const html = renderPdfHtml(meta, [{ heading: "Reports", table: { columns: [{ label: "Condition" }], rows: [], empty: "No reports match these filters." } }]);
    expect(html).toContain("No reports match these filters.");
  });
});
