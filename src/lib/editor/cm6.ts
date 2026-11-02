import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { search, setSearchQuery, SearchQuery } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { findMatches, cycleIndex, type Match } from "../utils/text-search";
import { searchActiveIndex, searchTotal } from "../stores/search";

export const appearanceCompartment = new Compartment();
export const fontCompartment = new Compartment();
export const lineNumbersCompartment = new Compartment();

export type ChangeHandler = (value: string) => void;
export type DocChangeHandler = (doc: string) => void;
let changeHandler: ChangeHandler | null = null;
let docChangeHandler: DocChangeHandler | null = null;

export function setEditorHandlers(onChange: ChangeHandler | null, onDocChange: DocChangeHandler | null): void {
  changeHandler = onChange;
  docChangeHandler = onDocChange;
}

interface Palette {
  bg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  code: string;
  link: string;
  selection: string;
  active: string;
  search: string;
  searchSelected: string;
}

const LIGHT: Palette = {
  bg: "#fafafa",
  text: "#1c1c1e",
  muted: "#6e6e73",
  border: "#e5e5ea",
  accent: "#0891b2",
  code: "#cf222e",
  link: "#0969da",
  selection: "rgba(8, 145, 178, 0.18)",
  active: "rgba(0, 0, 0, 0.035)",
  search: "#fde68a",
  searchSelected: "#f97316",
};

const DARK: Palette = {
  bg: "#161618",
  text: "#e5e5e7",
  muted: "#8e8e93",
  border: "#2c2c2e",
  accent: "#22d3ee",
  code: "#ff7b72",
  link: "#58a6ff",
  selection: "rgba(34, 211, 238, 0.22)",
  active: "rgba(255, 255, 255, 0.045)",
  search: "#854d0e",
  searchSelected: "#ea580c",
};

function palette(dark: boolean): Palette {
  return dark ? DARK : LIGHT;
}

function themeSpec(dark: boolean) {
  const c = palette(dark);
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        backgroundColor: "transparent",
        color: c.text,
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", Menlo, monospace',
      },
      ".cm-content": {
        padding: "32px",
        caretColor: c.text,
        minHeight: "100%",
      },
      ".cm-line": {
        padding: "0",
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: c.muted,
        border: "none",
        paddingLeft: "12px",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 8px 0 0",
      },
      ".cm-activeLine": {
        backgroundColor: c.active,
      },
      ".cm-activeLineGutter": {
        backgroundColor: c.active,
        color: c.text,
      },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
        backgroundColor: c.selection,
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: c.text,
      },
      ".cm-searchMatch": {
        backgroundColor: c.search,
        borderRadius: "2px",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: c.searchSelected,
      },
      ".cm-panels": {
        backgroundColor: c.bg,
        color: c.text,
      },
      ".cm-tooltip": {
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      },
    },
    { dark }
  );
}

function highlightStyle(dark: boolean) {
  const c = palette(dark);
  return HighlightStyle.define([
    { tag: tags.heading1, fontSize: "1.7em", fontWeight: "700", color: c.accent, lineHeight: "1.3" },
    { tag: tags.heading2, fontSize: "1.45em", fontWeight: "700", color: c.accent, lineHeight: "1.35" },
    { tag: tags.heading3, fontSize: "1.25em", fontWeight: "650", color: c.accent, lineHeight: "1.4" },
    { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "650", color: c.accent },
    { tag: tags.strong, fontWeight: "700" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.strikethrough, textDecoration: "line-through" },
    { tag: tags.link, color: c.link },
    { tag: tags.url, color: c.link, textDecoration: "underline" },
    {
      tag: tags.monospace,
      color: c.code,
      backgroundColor: dark ? "rgba(255, 123, 114, 0.1)" : "rgba(207, 34, 46, 0.08)",
      borderRadius: "3px",
    },
    { tag: tags.quote, color: c.muted, fontStyle: "italic" },
    { tag: tags.list, color: c.muted },
    { tag: tags.meta, color: c.muted },
    { tag: tags.processingInstruction, color: c.muted },
    { tag: tags.contentSeparator, color: c.border },
    { tag: tags.atom, color: c.accent },
    { tag: tags.invalid, color: "#ff3b30" },
  ]);
}

export function appearanceExtension(dark: boolean, syntax: boolean) {
  return [
    themeSpec(dark),
    syntax ? syntaxHighlighting(highlightStyle(dark)) : [],
  ];
}

export function fontExtension(fontSize: number, lineHeight: number) {
  return EditorView.theme({
    "&": { fontSize: `${fontSize}px` },
    ".cm-scroller": { lineHeight: String(lineHeight) },
  });
}

export function lineNumberExtension(show: boolean) {
  return show ? lineNumbers() : [];
}

export function createEditorState(
  doc: string,
  dark: boolean,
  fontSize: number,
  lineHeight: number,
  showLineNumbers: boolean,
  syntax: boolean
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      history({ minDepth: 1000, newGroupDelay: 500 }),
      drawSelection(),
      dropCursor(),
      highlightSpecialChars(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      rectangularSelection(),
      crosshairCursor(),
      lineNumbersCompartment.of(lineNumberExtension(showLineNumbers)),
      appearanceCompartment.of(appearanceExtension(dark, syntax)),
      fontCompartment.of(fontExtension(fontSize, lineHeight)),
      markdown(),
      bracketMatching(),
      indentOnInput(),
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
      EditorView.contentAttributes.of({
        spellcheck: "false",
        autocapitalize: "off",
        autocomplete: "off",
      }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      search(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const doc = update.state.doc.toString();
          changeHandler?.(doc);
          docChangeHandler?.(doc);
        }
      }),
    ],
  });
}

export class EditorSearchController {
  private view: EditorView;
  private matches: Match[] = [];
  private query = "";
  private active = 0;

  constructor(view: EditorView) {
    this.view = view;
  }

  private applyQuery(): void {
    this.view.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({ search: this.query, literal: true, caseSensitive: false })
      ),
    });
  }

  private select(index: number): void {
    const match = this.matches[index];
    if (!match) return;
    this.active = index;
    searchActiveIndex.set(index);
    this.view.dispatch({
      selection: { anchor: match.start, head: match.end },
      effects: EditorView.scrollIntoView(match.start, { y: "center" }),
    });
  }

  setQuery(query: string): boolean {
    this.query = query;
    this.matches = findMatches(this.view.state.doc.toString(), query);
    searchTotal.set(this.matches.length);
    searchActiveIndex.set(0);
    this.active = 0;
    this.applyQuery();
    if (this.matches.length > 0) this.select(0);
    return true;
  }

  next(): boolean {
    if (this.matches.length === 0) return true;
    this.select(cycleIndex(this.active, this.matches.length, 1));
    return true;
  }

  prev(): boolean {
    if (this.matches.length === 0) return true;
    this.select(cycleIndex(this.active, this.matches.length, -1));
    return true;
  }

  clear(): void {
    this.query = "";
    this.matches = [];
    this.active = 0;
    searchTotal.set(0);
    searchActiveIndex.set(0);
    this.view.dispatch({
      effects: setSearchQuery.of(new SearchQuery({ search: "", literal: true, caseSensitive: false })),
    });
  }

  onDocChanged(doc: string): void {
    if (!this.query) return;
    this.matches = findMatches(doc, this.query);
    searchTotal.set(this.matches.length);
    if (this.active >= this.matches.length) {
      this.active = 0;
      searchActiveIndex.set(0);
    }
  }
}
