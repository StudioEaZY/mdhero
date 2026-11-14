export type AuthorType = "you" | "ai" | "other";

export interface AuthorSpan {
  from: number;
  to: number;
  author: AuthorType;
}

export interface NoteAuthorshipMetadata {
  enabled: boolean;
  createdBy?: AuthorType;
  lastModifiedBy?: AuthorType | "external";
  lastModifiedAt?: string;
  revisions?: number;
}

export interface AuthorshipData {
  spans: AuthorSpan[];
  metadata: NoteAuthorshipMetadata;
  checksum?: string;
  bodyLength: number;
}

export interface AuthorshipStats {
  youCount: number;
  aiCount: number;
  otherCount: number;
  totalChars: number;
  youPercent: number;
  aiPercent: number;
  otherPercent: number;
  dominantAuthor: AuthorType;
}

export type PasteAttributionPreference = "ai" | "you" | "other" | "prompt";

export interface PasteDetectionResult {
  author: AuthorType;
  source: string;
  isAi: boolean;
  confidence: "high" | "heuristic" | "default";
}
