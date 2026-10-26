import { describe, expect, it } from "vitest";
import { isTicketImage, shortFileType } from "./files.js";

describe("ticket files", () => {
  it("shows images as thumbnails only for the four viewer types", () => {
    expect(["image/png", "image/jpeg", "image/gif", "image/webp"].every(isTicketImage)).toBe(true);
    expect(isTicketImage("image/svg+xml")).toBe(false);
    expect(isTicketImage("application/pdf")).toBe(false);
  });

  it("names a file's type from its extension, else from its MIME type", () => {
    expect(shortFileType("Elmwood ARV summary.pdf", "application/pdf")).toBe("PDF");
    expect(shortFileType("elmwood-comps.csv", "text/csv")).toBe("CSV");
    expect(shortFileType("notes", "text/plain")).toBe("TXT");
  });
});
