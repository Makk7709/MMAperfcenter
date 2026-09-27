import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SparringPDFExport } from "./SparringPDFExport";
import { sparringFixture as analysis } from "@/test/sparringFixture";
const pdf = vi.hoisted(() => ({ pages: 0, bytes: 0, name: "", fail: false }));
vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>();
  return {
    ...actual,
    jsPDF: class extends actual.jsPDF {
      constructor() {
        super();
        if (pdf.fail) throw Error("export unavailable");
        this.save = ((name: string) => {
          pdf.pages = this.getNumberOfPages();
          pdf.bytes = this.output("arraybuffer").byteLength;
          pdf.name = name;
          return this;
        }) as unknown as typeof this.save;
      }
    },
  };
});
beforeEach(() => {
  pdf.pages = 0;
  pdf.bytes = 0;
  pdf.name = "";
  pdf.fail = false;
});
it("produces a nonempty multipage PDF from the actual analysis", async () => {
  render(
    <SparringPDFExport
      analysis={analysis}
      videoName="Round test"
      analysisDate="2026-09-27"
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(pdf.pages).toBeGreaterThan(2));
  expect(pdf.bytes).toBeGreaterThan(10000);
  expect(pdf.name).toMatch(/\.pdf$/);
  expect(screen.getByRole("button")).toBeEnabled();
});
it("exports older records without optional metrics or techniques", async () => {
  render(
    <SparringPDFExport
      analysis={{
        ...analysis,
        analysis_quality: undefined,
        rounds: undefined,
        techniques_observed: [],
        key_moments: [],
        fighters: [],
        recommendations: { fighter_1: [], fighter_2: [] },
      }}
      videoName="Archive"
      analysisDate="2026-09-26"
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(pdf.bytes).toBeGreaterThan(1000));
});
it("allows retrying after a failed export", async () => {
  pdf.fail = true;
  render(
    <SparringPDFExport
      analysis={analysis}
      videoName="Round"
      analysisDate="2026-09-27"
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  expect(pdf.bytes).toBe(0);
});
