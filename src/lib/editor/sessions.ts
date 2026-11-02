import type { EditorState } from "@codemirror/state";

/**
 * One CodeMirror state per open tab. Keeping the state (and therefore the
 * history field) here is what makes undo survive a tab switch.
 */
const sessions = new Map<string, EditorState>();

export function getSession(tabId: string): EditorState | undefined {
  return sessions.get(tabId);
}

export function putSession(tabId: string, state: EditorState): void {
  sessions.set(tabId, state);
}

