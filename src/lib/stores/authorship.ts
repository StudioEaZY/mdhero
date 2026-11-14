import { writable, derived, get } from "svelte/store";
import type { AuthorshipData, AuthorshipStats, AuthorType, AuthorSpan } from "../authorship/types";
import {
  parseDocument,
  serializeDocument,
  computeAuthorshipStats,
  normalizeSpans,
  quickChecksum,
} from "../authorship/parser";
import { settings } from "./settings";

// Map tabId -> AuthorshipData
const tabAuthorshipMap = new Map<string, AuthorshipData>();

export const currentTabAuthorship = writable<AuthorshipData | null>(null);

export interface LastPasted {
  tabId: string;
  from: number;
  to: number;
  author: AuthorType;
  source: string;
}

export const lastPasted = writable<LastPasted | null>(null);

/**
 * Derived store providing real-time stats (percentages, counts) for the active tab.
 */
export const authorshipStats = derived(currentTabAuthorship, ($data) => {
  if (!$data) {
    return {
      youCount: 0,
      aiCount: 0,
      otherCount: 0,
      totalChars: 0,
      youPercent: 100,
      aiPercent: 0,
      otherPercent: 0,
      dominantAuthor: "you" as AuthorType,
    };
  }
  return computeAuthorshipStats(new Array($data.bodyLength).fill(" ").join(""), $data);
});

/**
 * Initializes or loads authorship for a tab from raw file content.
 */
export function initTabAuthorship(tabId: string, rawContent: string): { body: string; data: AuthorshipData | null } {
  const { body, authorship } = parseDocument(rawContent);

  if (authorship) {
    tabAuthorshipMap.set(tabId, authorship);
    currentTabAuthorship.set(authorship);
    return { body, data: authorship };
  }

  const s = get(settings);
  if (s.authorshipEnabled) {
    // If enabled by user, initialize clean tracking
    const initialData: AuthorshipData = {
      spans: body.length > 0 ? [{ from: 0, to: body.length, author: "you" }] : [],
      metadata: { enabled: true, createdBy: "you", lastModifiedBy: "you" },
      bodyLength: body.length,
      checksum: quickChecksum(body),
    };
    tabAuthorshipMap.set(tabId, initialData);
    currentTabAuthorship.set(initialData);
    return { body, data: initialData };
  }

  tabAuthorshipMap.delete(tabId);
  currentTabAuthorship.set(null);
  return { body, data: null };
}

/**
 * Switches the active tab in the store.
 */
export function selectTabAuthorship(tabId: string): void {
  const existing = tabAuthorshipMap.get(tabId) || null;
  currentTabAuthorship.set(existing);
  lastPasted.set(null);
}

/**
 * Serializes the document with trailing annotations for saving.
 */
export function getSerializedContent(tabId: string, currentBody: string): string {
  const data = tabAuthorshipMap.get(tabId);
  const s = get(settings);

  if (!data || !s.authorshipEnabled) {
    return currentBody;
  }

  data.bodyLength = currentBody.length;
  data.checksum = quickChecksum(currentBody);
  return serializeDocument(currentBody, data);
}

/**
 * Updates span ranges in response to an edit in the editor (insertion / deletion / replacement).
 */
export function applyEditToSpans(
  spans: AuthorSpan[],
  from: number,
  to: number,
  insertLength: number,
  author: AuthorType
): AuthorSpan[] {
  const deletedLength = to - from;
  const delta = insertLength - deletedLength;
  const nextSpans: AuthorSpan[] = [];

  for (const span of spans) {
    if (span.to <= from) {
      // Entirely before the edit range
      nextSpans.push({ ...span });
    } else if (span.from >= to) {
      // Entirely after the edit range - shift by delta
      nextSpans.push({
        from: span.from + delta,
        to: span.to + delta,
        author: span.author,
      });
    } else {
      // Overlaps the edit range
      if (span.from < from) {
        // Keep part before 'from'
        nextSpans.push({
          from: span.from,
          to: from,
          author: span.author,
        });
      }
      if (span.to > to) {
        // Keep part after 'to'
        nextSpans.push({
          from: to + delta,
          to: span.to + delta,
          author: span.author,
        });
      }
    }
  }

  // Add the newly inserted range if non-empty
  if (insertLength > 0) {
    nextSpans.push({
      from,
      to: from + insertLength,
      author,
    });
  }

  return normalizeSpans(nextSpans);
}

/**
 * Records an edit on the tab's authorship data.
 */
export function recordEdit(
  tabId: string,
  from: number,
  to: number,
  insertLength: number,
  author: AuthorType = "you"
): void {
  let data = tabAuthorshipMap.get(tabId);
  const s = get(settings);

  if (!data && s.authorshipEnabled) {
    data = {
      spans: [],
      metadata: { enabled: true, createdBy: author, lastModifiedBy: author },
      bodyLength: 0,
    };
    tabAuthorshipMap.set(tabId, data);
  }

  if (!data || !s.authorshipEnabled) return;

  data.spans = applyEditToSpans(data.spans, from, to, insertLength, author);
  data.bodyLength += (insertLength - (to - from));
  data.metadata.lastModifiedBy = author;
  data.metadata.lastModifiedAt = new Date().toISOString();

  currentTabAuthorship.set({ ...data });
}

/**
 * Re-attributes a specific span (used by the "Paste As" widget).
 */
export function reattributeRange(
  tabId: string,
  from: number,
  to: number,
  newAuthor: AuthorType
): void {
  const data = tabAuthorshipMap.get(tabId);
  if (!data) return;

  const nextSpans: AuthorSpan[] = [];
  for (const span of data.spans) {
    if (span.to <= from || span.from >= to) {
      nextSpans.push({ ...span });
    } else {
      // Truncate before
      if (span.from < from) {
        nextSpans.push({ from: span.from, to: from, author: span.author });
      }
      // Truncate after
      if (span.to > to) {
        nextSpans.push({ from: to, to: span.to, author: span.author });
      }
    }
  }

  nextSpans.push({ from, to, author: newAuthor });
  data.spans = normalizeSpans(nextSpans);
  currentTabAuthorship.set({ ...data });

  const currentPasted = get(lastPasted);
  if (currentPasted && currentPasted.tabId === tabId) {
    lastPasted.set({ ...currentPasted, author: newAuthor });
  }
}

/**
 * Sets the last pasted range to display the "Paste As" indicator.
 */
export function setLastPasted(
  tabId: string,
  from: number,
  to: number,
  author: AuthorType,
  source: string
): void {
  lastPasted.set({ tabId, from, to, author, source });
}

export function clearLastPasted(): void {
  lastPasted.set(null);
}
