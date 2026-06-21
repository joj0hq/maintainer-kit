import { describe, expect, it } from "vitest";
import {
  renderBulletList,
  renderChecklist,
  renderQuotedDraft,
  sanitizeListItem,
  sanitizeMarkdownText
} from "../src/render/markdown.js";

describe("sanitizeMarkdownText", () => {
  it("strips HTML comments", () => {
    expect(sanitizeMarkdownText("before<!-- hidden -->after")).toBe("beforeafter");
  });

  it("strips multi-line HTML comments", () => {
    expect(sanitizeMarkdownText("a<!--\nmulti\nline\n-->b")).toBe("ab");
  });

  it("normalizes CRLF to LF and trims surrounding whitespace", () => {
    expect(sanitizeMarkdownText("  line1\r\nline2  ")).toBe("line1\nline2");
  });
});

describe("sanitizeListItem", () => {
  it("collapses newlines into a single space", () => {
    expect(sanitizeListItem("first\nsecond")).toBe("first second");
  });

  it("removes a leading bullet marker", () => {
    expect(sanitizeListItem("- item")).toBe("item");
    expect(sanitizeListItem("* item")).toBe("item");
  });

  it("removes a leading checkbox marker", () => {
    expect(sanitizeListItem("[ ] todo")).toBe("todo");
    expect(sanitizeListItem("[x] done")).toBe("done");
  });

  it("falls back to the empty text when nothing remains", () => {
    expect(sanitizeListItem("   ")).toBe("Not specified");
    expect(sanitizeListItem("", "n/a")).toBe("n/a");
  });
});

describe("renderBulletList", () => {
  it("renders each item as a bullet", () => {
    expect(renderBulletList(["alpha", "beta"])).toBe("- alpha\n- beta");
  });

  it("sanitizes existing markers instead of doubling them", () => {
    expect(renderBulletList(["- alpha"])).toBe("- alpha");
  });

  it("returns the empty fallback for an empty list", () => {
    expect(renderBulletList([])).toBe("- None identified.");
    expect(renderBulletList([], "Nothing here.")).toBe("- Nothing here.");
  });
});

describe("renderChecklist", () => {
  it("renders each item as an unchecked checkbox", () => {
    expect(renderChecklist(["verify a", "verify b"])).toBe("- [ ] verify a\n- [ ] verify b");
  });

  it("returns the empty fallback for an empty list", () => {
    expect(renderChecklist([])).toBe("- [ ] Add a targeted verification case.");
  });
});

describe("renderQuotedDraft", () => {
  it("prefixes every line with a blockquote marker", () => {
    expect(renderQuotedDraft("line1\nline2")).toBe("> line1\n> line2");
  });

  it("trims whitespace on each quoted line", () => {
    expect(renderQuotedDraft("  spaced  ")).toBe("> spaced");
  });

  it("returns the empty fallback when there is no content", () => {
    expect(renderQuotedDraft("")).toBe("> Not specified.");
    expect(renderQuotedDraft("<!-- only a comment -->")).toBe("> Not specified.");
  });
});
