import { Compartment, type Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { get } from "svelte/store";
import { settings } from "../stores/settings";
import {
  currentTabAuthorship,
  recordEdit,
  setLastPasted,
  clearLastPasted,
} from "../stores/authorship";
import { detectClipboardAuthor } from "../authorship/clipboard";
import type { AuthorSpan, AuthorType } from "../authorship/types";

export const authorshipCompartment = new Compartment();

let activeTabId = "";
let isPasting = false;

export function setAuthorshipActiveTab(tabId: string): void {
  activeTabId = tabId;
}

const aiDecoration = Decoration.mark({ class: "cm-author-ai" });
const otherDecoration = Decoration.mark({ class: "cm-author-other" });

function buildDecorations(view: EditorView): DecorationSet {
  const s = get(settings);
  if (!s.authorshipEnabled || !s.authorshipHighlightInEditor) {
    return Decoration.none;
  }

  const authorship = get(currentTabAuthorship);
  if (!authorship || authorship.spans.length === 0) {
    return Decoration.none;
  }

  const docLength = view.state.doc.length;
  const builder = new RangeSetBuilder<Decoration>();

  for (const span of authorship.spans) {
    const from = Math.max(0, Math.min(span.from, docLength));
    const to = Math.max(0, Math.min(span.to, docLength));
    if (to > from) {
      if (span.author === "ai") {
        builder.add(from, to, aiDecoration);
      } else if (span.author === "other") {
        builder.add(from, to, otherDecoration);
      }
    }
  }

  return builder.finish();
}

export const authorshipViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Paste event handler for CodeMirror 6 to detect AI and apply "Paste As" logic.
 */
export const authorshipPasteHandler = EditorView.domEventHandlers({
  paste(event: ClipboardEvent, view: EditorView) {
    const s = get(settings);
    if (!s.authorshipEnabled) return false;

    const defaultAuthor = s.authorshipDefaultPasteAs === "prompt" ? "ai" : s.authorshipDefaultPasteAs;
    const detected = detectClipboardAuthor(event, defaultAuthor);
    const text = event.clipboardData?.getData("text/plain");
    if (!text) return false;

    event.preventDefault();
    isPasting = true;

    const { state } = view;
    const mainSel = state.selection.main;
    const from = mainSel.from;
    const to = mainSel.to;
    const insertLength = text.length;

    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + insertLength },
    });

    if (activeTabId) {
      recordEdit(activeTabId, from, to, insertLength, detected.author);
      if (s.authorshipShowPasteAsWidget) {
        setLastPasted(activeTabId, from, from + insertLength, detected.author, detected.source);
      }
    }

    setTimeout(() => {
      isPasting = false;
    }, 50);

    return true;
  },

  keydown() {
    // Typing or navigating dismisses the last pasted prompt
    clearLastPasted();
    return false;
  },

  mousedown() {
    clearLastPasted();
    return false;
  },
});

/**
 * Update listener to track human typing in CodeMirror.
 */
export const authorshipUpdateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged && !isPasting && activeTabId) {
    const s = get(settings);
    if (!s.authorshipEnabled) return;

    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertLength = inserted.length;
      recordEdit(activeTabId, fromA, toA, insertLength, "you");
    });
  }
});

const authorshipStyles = EditorView.theme({
  ".cm-author-ai": {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderBottom: "1.5px solid rgba(6, 182, 212, 0.5)",
    borderRadius: "2px",
    padding: "0 1px",
  },
  ".cm-author-other": {
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    borderBottom: "1.5px dotted rgba(168, 85, 247, 0.5)",
    borderRadius: "2px",
    padding: "0 1px",
  },
  ":global(html.dark) .cm-author-ai": {
    backgroundColor: "rgba(34, 211, 238, 0.16)",
    borderBottomColor: "rgba(34, 211, 238, 0.6)",
  },
  ":global(html.dark) .cm-author-other": {
    backgroundColor: "rgba(192, 132, 252, 0.14)",
    borderBottomColor: "rgba(192, 132, 252, 0.6)",
  },
});

export function authorshipExtension(): Extension[] {
  return [
    authorshipViewPlugin,
    authorshipPasteHandler,
    authorshipUpdateListener,
    authorshipStyles,
  ];
}
