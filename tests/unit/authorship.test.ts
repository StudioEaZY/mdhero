import { describe, expect, it } from "vitest";
import {
  parseDocument,
  serializeDocument,
  stripAuthorship,
  normalizeSpans,
  detectOutsideEdits,
  computeAuthorshipStats,
  quickChecksum,
} from "../../src/lib/authorship/parser";
import { detectClipboardAuthor } from "../../src/lib/authorship/clipboard";
import type { AuthorshipData } from "../../src/lib/authorship/types";

describe("Authorship Parser & Serializer", () => {
  it("normalizes and merges contiguous spans of the same author", () => {
    const raw = [
      { from: 0, to: 10, author: "you" as const },
      { from: 10, to: 25, author: "you" as const },
      { from: 25, to: 40, author: "ai" as const },
      { from: 40, to: 50, author: "ai" as const },
    ];
    const normalized = normalizeSpans(raw);
    expect(normalized).toEqual([
      { from: 0, to: 25, author: "you" },
      { from: 25, to: 50, author: "ai" },
    ]);
  });

  it("parses an annotated document and strips trailing block from body", () => {
    const doc = `# Hello World

This is a test of human and AI collaboration.

---
Authorship:
CreatedBy: you
LastModifiedBy: ai
Length: 60
Checksum: ${quickChecksum("# Hello World\n\nThis is a test of human and AI collaboration.")}
@You: 0,15
&AI: 15,45
...`;

    const { body, authorship } = parseDocument(doc);
    expect(body).toBe("# Hello World\n\nThis is a test of human and AI collaboration.");
    expect(authorship).not.toBeNull();
    expect(authorship?.metadata.createdBy).toBe("you");
    expect(authorship?.metadata.lastModifiedBy).toBe("ai");
    expect(authorship?.spans).toEqual([
      { from: 0, to: 15, author: "you" },
      { from: 15, to: 60, author: "ai" },
    ]);
  });

  it("serializes document cleanly back to markdown with trailing block", () => {
    const body = "# Title\n\nSome AI generated line.";
    const data: AuthorshipData = {
      spans: [
        { from: 0, to: 9, author: "you" },
        { from: 9, to: body.length, author: "ai" },
      ],
      metadata: { enabled: true, createdBy: "you", lastModifiedBy: "ai" },
      bodyLength: body.length,
    };

    const serialized = serializeDocument(body, data);
    expect(serialized).toContain("---");
    expect(serialized).toContain("Authorship:");
    expect(serialized).toContain("@You: 0,9");
    expect(serialized).toContain(`&AI: 9,${body.length - 9}`);
    expect(serialized).toContain("...");

    // Round-trip parse
    const reparsed = parseDocument(serialized);
    expect(reparsed.body).toBe(body);
    expect(reparsed.authorship?.spans).toEqual(data.spans);
  });

  it("stripAuthorship removes annotations completely", () => {
    const raw = `# Notes\n\nBody text.\n\n---\nAuthorship:\n@You: 0,10\n...`;
    expect(stripAuthorship(raw).trim()).toBe("# Notes\n\nBody text.");
  });

  it("detects outside software edits when text was changed externally", () => {
    const originalBody = "Hello world";
    const saved: AuthorshipData = {
      spans: [{ from: 0, to: 11, author: "you" }],
      metadata: { enabled: true, createdBy: "you", lastModifiedBy: "you" },
      bodyLength: 11,
      checksum: quickChecksum(originalBody),
    };

    // Modified outside MDHero (e.g. VS Code added 10 chars at the end)
    const modifiedBody = "Hello world from VSCode";
    const reconciled = detectOutsideEdits(modifiedBody, saved);

    expect(reconciled.metadata.lastModifiedBy).toBe("external");
    expect(reconciled.spans).toEqual([
      { from: 0, to: 11, author: "you" },
      { from: 11, to: 23, author: "other" },
    ]);
  });

  it("computes accurate stats and dominant author", () => {
    const body = "1234567890"; // 10 chars
    const data: AuthorshipData = {
      spans: [
        { from: 0, to: 3, author: "you" },  // 3 chars
        { from: 3, to: 10, author: "ai" },  // 7 chars
      ],
      metadata: { enabled: true },
      bodyLength: 10,
    };
    const stats = computeAuthorshipStats(body, data);
    expect(stats.totalChars).toBe(10);
    expect(stats.youPercent).toBe(30);
    expect(stats.aiPercent).toBe(70);
    expect(stats.dominantAuthor).toBe("ai");
  });
});

describe("Authorship Clipboard Detection", () => {
  it("detects ChatGPT from HTML clipboard data", () => {
    const mockEvent = {
      clipboardData: {
        getData: (type: string) => {
          if (type === "text/html") {
            return '<div class="markdown prose" data-message-author-role="assistant"><p>Here is text</p></div>';
          }
          return "Here is text";
        },
      } as unknown as DataTransfer,
    };

    const res = detectClipboardAuthor(mockEvent, "ai");
    expect(res.author).toBe("ai");
    expect(res.source).toBe("ChatGPT");
    expect(res.confidence).toBe("high");
  });

  it("detects Claude from HTML clipboard data", () => {
    const mockEvent = {
      clipboardData: {
        getData: (type: string) => {
          if (type === "text/html") {
            return '<div class="font-claude-message">From Claude</div>';
          }
          return "From Claude";
        },
      } as unknown as DataTransfer,
    };

    const res = detectClipboardAuthor(mockEvent, "ai");
    expect(res.author).toBe("ai");
    expect(res.source).toBe("Claude");
  });

  it("detects Google Gemini from HTML clipboard data", () => {
    const mockEvent = {
      clipboardData: {
        getData: (type: string) => {
          if (type === "text/html") {
            return '<div class="model-response">From Gemini</div>';
          }
          return "From Gemini";
        },
      } as unknown as DataTransfer,
    };

    const res = detectClipboardAuthor(mockEvent, "ai");
    expect(res.author).toBe("ai");
    expect(res.source).toBe("Google Gemini");
  });

  it("detects OS Writing Tools / PowerToys from HTML clipboard data", () => {
    const mockEvent = {
      clipboardData: {
        getData: (type: string) => {
          if (type === "text/html") {
            return '<div data-source="powertoys.advancedpaste">From PowerToys</div>';
          }
          return "From PowerToys";
        },
      } as unknown as DataTransfer,
    };

    const res = detectClipboardAuthor(mockEvent, "ai");
    expect(res.author).toBe("ai");
    expect(res.source).toBe("OS Writing Tools");
  });

  it("falls back to default author (ai by default)", () => {
    const mockEvent = {
      clipboardData: {
        getData: () => "",
      } as unknown as DataTransfer,
    };

    const res = detectClipboardAuthor(mockEvent, "ai");
    expect(res.author).toBe("ai");
    expect(res.isAi).toBe(true);
  });
});
