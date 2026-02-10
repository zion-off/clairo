import { Keybinding } from '../components/ui/KeybindingsBar.js';

export type JiraBrowserFocusedBox = 'saved-views' | 'browser';

export const JIRA_BROWSER_KEYBINDINGS: Record<JiraBrowserFocusedBox, Keybinding[]> = {
  'saved-views': [
    { key: 'Space', label: 'Select' },
    { key: 'a', label: 'Add View', color: 'green' },
    { key: 'e', label: 'Rename' },
    { key: 'd', label: 'Delete', color: 'red' }
  ],
  browser: [
    { key: 'Enter', label: 'Details' },
    { key: '/', label: 'Filter' },
    { key: 'u', label: 'Unassigned' },
    { key: 'm', label: 'Mine' },
    { key: 'x', label: 'Clear Filters' },
    { key: 'l', label: 'Load More' },
    { key: 'o', label: 'Open', color: 'green' },
    { key: 'y', label: 'Copy Link' },
    { key: 'r', label: 'Refresh' }
  ]
};
