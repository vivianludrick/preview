import { writable } from 'svelte/store';

export type ViewMode = 'editor' | 'split' | 'preview';

/** Current pane layout; each previewer page resets this on mount. */
export const viewMode = writable<ViewMode>('split');

/**
 * Set by the active previewer page so the header's 🔗 button can open
 * that page's share dialog. Null on pages with nothing to share.
 */
export const shareHandler = writable<(() => void) | null>(null);
