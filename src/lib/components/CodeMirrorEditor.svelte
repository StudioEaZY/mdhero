<script lang="ts">
  import { onMount } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { getEffectiveTheme } from "$lib/stores/theme";
  import {
    appearanceCompartment,
    appearanceExtension,
    createEditorState,
    EditorSearchController,
    fontCompartment,
    fontExtension,
    lineNumberExtension,
    lineNumbersCompartment,
    setEditorHandlers,
  } from "$lib/editor/cm6";
  import { getSession, putSession } from "$lib/editor/sessions";
  import { editorSearch } from "$lib/editor/search-bridge";

  let {
    tabId,
    value,
    onChange,
    fontSize = 14,
    lineHeight = 1.6,
    maxWidth = "720px",
    showLineNumbers = false,
    syntaxHighlighting = false,
  }: {
    tabId: string;
    value: string;
    onChange: (newValue: string) => void;
    fontSize?: number;
    lineHeight?: number;
    maxWidth?: string;
    showLineNumbers?: boolean;
    syntaxHighlighting?: boolean;
  } = $props();

  let host: HTMLDivElement | undefined = $state();
  let ready = $state(false);
  let dark = $state(getEffectiveTheme() === "dark");
  let view: EditorView | null = null;
  let searchController: EditorSearchController | null = null;
  let currentTabId = "";
  let observer: MutationObserver | null = null;

  function applySettings(): void {
    if (!view) return;
    view.dispatch({
      effects: [
        appearanceCompartment.reconfigure(appearanceExtension(dark, syntaxHighlighting)),
        fontCompartment.reconfigure(fontExtension(fontSize, lineHeight)),
        lineNumbersCompartment.reconfigure(lineNumberExtension(showLineNumbers)),
      ],
    });
  }

  function replaceValue(next: string): void {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === next) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
  }

  function switchTab(nextTabId: string, nextValue: string): void {
    if (!view) return;
    putSession(currentTabId, view.state);
    currentTabId = nextTabId;
    const existing = getSession(nextTabId);
    if (existing) {
      view.setState(existing);
    } else {
      const state = createEditorState(
        nextValue,
        dark,
        fontSize,
        lineHeight,
        showLineNumbers,
        syntaxHighlighting
      );
      putSession(nextTabId, state);
      view.setState(state);
    }
    setEditorHandlers(onChange, (doc) => searchController?.onDocChanged(doc));
    applySettings();
    if (view.state.doc.toString() !== nextValue) replaceValue(nextValue);
    view.focus();
  }

  onMount(() => {
    if (!host) return;
    const initial = getSession(tabId);
    const state =
      initial ??
      createEditorState(value, dark, fontSize, lineHeight, showLineNumbers, syntaxHighlighting);
    putSession(tabId, state);
    currentTabId = tabId;
    view = new EditorView({ state, parent: host });
    searchController = new EditorSearchController(view);
    editorSearch.register(searchController);
    setEditorHandlers(onChange, (doc) => searchController?.onDocChanged(doc));
    ready = true;
    if (view.state.doc.toString() !== value) replaceValue(value);
    view.focus();

    observer = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      if (view) putSession(currentTabId, view.state);
      if (searchController) editorSearch.unregister(searchController);
      setEditorHandlers(null, null);
      observer?.disconnect();
      view?.destroy();
      view = null;
      searchController = null;
    };
  });

  // Keep the latest prop callbacks without recreating the editor.
  $effect(() => {
    if (!ready || !view) return;
    setEditorHandlers(onChange, (doc) => searchController?.onDocChanged(doc));
  });

  // Reconfigure appearance/typography/line numbers in place.
  $effect(() => {
    if (!ready || !view) return;
    void dark;
    void fontSize;
    void lineHeight;
    void showLineNumbers;
    void syntaxHighlighting;
    applySettings();
  });

  // Switch documents, or accept an external reload for the current one.
  $effect(() => {
    if (!ready || !view) return;
    if (tabId !== currentTabId) {
      switchTab(tabId, value);
    } else if (value !== view.state.doc.toString() && !view.hasFocus) {
      replaceValue(value);
    }
  });
</script>

<div class="cm-shell">
  <div
    bind:this={host}
    class="cm-host"
    style="max-width: {maxWidth};"
    role="textbox"
    aria-label="Markdown editor"
    aria-multiline="true"
  ></div>
</div>

<style>
  .cm-shell {
    position: fixed;
    top: var(--chrome-top, 88px);
    left: var(--tabs-w, 0px);
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    background: #fafafa;
    z-index: 1;
  }

  :global(html.dark) .cm-shell {
    background: #161618;
  }

  .cm-host {
    flex: 1;
    width: 100%;
    height: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .cm-host :global(.cm-editor) {
    height: 100%;
  }

  .cm-host :global(.cm-scroller) {
    height: 100%;
  }
</style>
