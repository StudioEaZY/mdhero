export interface EditorSearchController {
  setQuery(query: string): boolean;
  next(): boolean;
  prev(): boolean;
  clear(): void;
}

let current: EditorSearchController | null = null;

/**
 * The find overlay is shared by the reader and both editor engines. The CM6
 * editor registers here while it is mounted; the overlay asks this bridge first
 * and falls back to its mark.js implementation when no editor owns the search.
 */
export const editorSearch = {
  register(controller: EditorSearchController): void {
    current = controller;
  },
  unregister(controller: EditorSearchController): void {
    if (current === controller) current = null;
  },
  isActive(): boolean {
    return current !== null;
  },
  setQuery(query: string): boolean {
    return current ? current.setQuery(query) : false;
  },
  next(): boolean {
    return current ? current.next() : false;
  },
  prev(): boolean {
    return current ? current.prev() : false;
  },
  clear(): void {
    current?.clear();
  },
};
