import type { AuthorSpan, AuthorshipData, AuthorshipStats, AuthorType, NoteAuthorshipMetadata } from "./types";

/**
 * Regex matching the trailing Authorship / Annotations block at the end of a markdown document.
 * Matches:
 * \n---\r?\n(?:Annotations|Authorship):[\s\S]*?\r?\n\.\.\.\s*$
 */
const TRAILING_ANNOTATION_BLOCK = /(?:\r?\n)+---\r?\n(?:Annotations|Authorship):([\s\S]*?)\r?\n\.\.\.\s*$/;

/**
 * Simple fast 32-bit FNV-1a or DJB2 checksum for fast integrity checking across platforms
 */
export function quickChecksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Strips the trailing Authorship / Annotations block from raw markdown.
 * Used by the markdown renderer so annotations are never rendered in HTML / preview.
 */
export function stripAuthorship(markdown: string): string {
  return markdown.replace(TRAILING_ANNOTATION_BLOCK, "");
}

/**
 * Compresses spans by merging adjacent spans with the same author and removing zero-width spans.
 */
export function normalizeSpans(spans: AuthorSpan[]): AuthorSpan[] {
  if (spans.length === 0) return [];

  // Sort by start offset
  const sorted = [...spans].filter((s) => s.to > s.from).sort((a, b) => a.from - b.from);
  if (sorted.length === 0) return [];

  const result: AuthorSpan[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.from <= current.to && next.author === current.author) {
      current.to = Math.max(current.to, next.to);
    } else if (next.from < current.to) {
      // Overlapping spans with different authors: truncate current span
      if (next.from > current.from) {
        result.push({ from: current.from, to: next.from, author: current.author });
      }
      current = { ...next };
    } else {
      result.push(current);
      current = { ...next };
    }
  }
  result.push(current);
  return result;
}

/**
 * Parses raw markdown into document body and parsed AuthorshipData.
 */
export function parseDocument(rawMarkdown: string): { body: string; authorship: AuthorshipData | null } {
  const match = rawMarkdown.match(TRAILING_ANNOTATION_BLOCK);
  if (!match) {
    return { body: rawMarkdown, authorship: null };
  }

  const body = rawMarkdown.slice(0, match.index);
  const blockContent = match[1];

  const lines = blockContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const spans: AuthorSpan[] = [];
  const metadata: NoteAuthorshipMetadata = { enabled: true };
  let checksum: string | undefined;
  let declaredLength = body.length;

  for (const line of lines) {
    if (line.startsWith("CreatedBy:")) {
      metadata.createdBy = line.replace("CreatedBy:", "").trim().toLowerCase() as AuthorType;
    } else if (line.startsWith("LastModifiedBy:")) {
      metadata.lastModifiedBy = line.replace("LastModifiedBy:", "").trim().toLowerCase() as AuthorType | "external";
    } else if (line.startsWith("Length:")) {
      declaredLength = parseInt(line.replace("Length:", "").trim(), 10) || body.length;
    } else if (line.startsWith("Checksum:")) {
      checksum = line.replace("Checksum:", "").trim();
    } else if (line.startsWith("@You:") || line.startsWith("@Human:")) {
      const parts = line.split(":")[1]?.trim().split(/\s+/) || [];
      for (const p of parts) {
        const [fromStr, lenStr] = p.split(",");
        const from = parseInt(fromStr, 10);
        const len = parseInt(lenStr, 10);
        if (!isNaN(from) && !isNaN(len) && len > 0) {
          spans.push({ from, to: from + len, author: "you" });
        }
      }
    } else if (line.startsWith("&AI:") || line.startsWith("&ai:")) {
      const parts = line.split(":")[1]?.trim().split(/\s+/) || [];
      for (const p of parts) {
        const [fromStr, lenStr] = p.split(",");
        const from = parseInt(fromStr, 10);
        const len = parseInt(lenStr, 10);
        if (!isNaN(from) && !isNaN(len) && len > 0) {
          spans.push({ from, to: from + len, author: "ai" });
        }
      }
    } else if (line.startsWith("+Other:") || line.startsWith("+other:") || line.startsWith("+External:")) {
      const parts = line.split(":")[1]?.trim().split(/\s+/) || [];
      for (const p of parts) {
        const [fromStr, lenStr] = p.split(",");
        const from = parseInt(fromStr, 10);
        const len = parseInt(lenStr, 10);
        if (!isNaN(from) && !isNaN(len) && len > 0) {
          spans.push({ from, to: from + len, author: "other" });
        }
      }
    }
  }

  const normalized = normalizeSpans(spans);
  const actualChecksum = quickChecksum(body);

  let authorship: AuthorshipData = {
    spans: normalized,
    metadata,
    checksum: actualChecksum,
    bodyLength: body.length,
  };

  // If checksum or length differs, outside software edited the file!
  if ((checksum && checksum !== actualChecksum) || declaredLength !== body.length) {
    authorship = detectOutsideEdits(body, authorship);
  }

  return { body, authorship };
}

/**
 * Serializes document body and authorship data into complete markdown with trailing block.
 */
export function serializeDocument(body: string, authorship: AuthorshipData | null): string {
  if (!authorship || !authorship.metadata.enabled) {
    return body;
  }

  const normalized = normalizeSpans(authorship.spans);
  const youSpans = normalized.filter((s) => s.author === "you");
  const aiSpans = normalized.filter((s) => s.author === "ai");
  const otherSpans = normalized.filter((s) => s.author === "other");

  const lines: string[] = ["", "---", "Authorship:"];
  if (authorship.metadata.createdBy) {
    lines.push(`CreatedBy: ${authorship.metadata.createdBy}`);
  }
  if (authorship.metadata.lastModifiedBy) {
    lines.push(`LastModifiedBy: ${authorship.metadata.lastModifiedBy}`);
  }
  lines.push(`Length: ${body.length}`);
  lines.push(`Checksum: ${quickChecksum(body)}`);

  if (youSpans.length > 0) {
    lines.push(`@You: ${youSpans.map((s) => `${s.from},${s.to - s.from}`).join(" ")}`);
  }
  if (aiSpans.length > 0) {
    lines.push(`&AI: ${aiSpans.map((s) => `${s.from},${s.to - s.from}`).join(" ")}`);
  }
  if (otherSpans.length > 0) {
    lines.push(`+Other: ${otherSpans.map((s) => `${s.from},${s.to - s.from}`).join(" ")}`);
  }

  lines.push("...");
  return body + lines.join("\n");
}

/**
 * Reconciles outside software edits (Obsidian Authorship Tracker style).
 * Attributes any uncovered / modified regions to "other" (external).
 */
export function detectOutsideEdits(currentBody: string, saved: AuthorshipData): AuthorshipData {
  const currentLen = currentBody.length;
  const validSpans: AuthorSpan[] = [];

  for (const span of saved.spans) {
    if (span.from < currentLen) {
      validSpans.push({
        from: span.from,
        to: Math.min(span.to, currentLen),
        author: span.author,
      });
    }
  }

  // Find gaps in coverage
  const covered = new Array<boolean>(currentLen).fill(false);
  for (const s of validSpans) {
    for (let i = s.from; i < s.to; i++) {
      covered[i] = true;
    }
  }

  // Any uncovered chars were inserted/edited externally
  let gapStart = -1;
  for (let i = 0; i <= currentLen; i++) {
    if (i < currentLen && !covered[i]) {
      if (gapStart === -1) gapStart = i;
    } else {
      if (gapStart !== -1) {
        validSpans.push({ from: gapStart, to: i, author: "other" });
        gapStart = -1;
      }
    }
  }

  return {
    spans: normalizeSpans(validSpans),
    metadata: {
      ...saved.metadata,
      lastModifiedBy: "external",
      lastModifiedAt: new Date().toISOString(),
    },
    checksum: quickChecksum(currentBody),
    bodyLength: currentLen,
  };
}

/**
 * Computes authorship statistics (percentages, char counts, dominant author).
 */
export function computeAuthorshipStats(body: string, data: AuthorshipData | null): AuthorshipStats {
  const totalChars = body.length;
  if (!data || totalChars === 0 || data.spans.length === 0) {
    return {
      youCount: totalChars,
      aiCount: 0,
      otherCount: 0,
      totalChars,
      youPercent: 100,
      aiPercent: 0,
      otherPercent: 0,
      dominantAuthor: "you",
    };
  }

  let youCount = 0;
  let aiCount = 0;
  let otherCount = 0;

  for (const span of data.spans) {
    const len = Math.max(0, Math.min(span.to, totalChars) - Math.max(0, span.from));
    if (span.author === "you") youCount += len;
    else if (span.author === "ai") aiCount += len;
    else if (span.author === "other") otherCount += len;
  }

  // Account for any unannotated remainder as "you"
  const accounted = youCount + aiCount + otherCount;
  if (accounted < totalChars) {
    youCount += (totalChars - accounted);
  }

  const youPercent = Math.round((youCount / totalChars) * 100);
  const aiPercent = Math.round((aiCount / totalChars) * 100);
  const otherPercent = Math.max(0, 100 - youPercent - aiPercent);

  let dominantAuthor: AuthorType = "you";
  if (aiCount > youCount && aiCount >= otherCount) dominantAuthor = "ai";
  else if (otherCount > youCount && otherCount > aiCount) dominantAuthor = "other";

  return {
    youCount,
    aiCount,
    otherCount,
    totalChars,
    youPercent,
    aiPercent,
    otherPercent,
    dominantAuthor,
  };
}
