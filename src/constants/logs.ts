import { Keybinding } from '../components/ui/KeybindingsBar.js';

export type LogsFocusedBox = 'history' | 'viewer';

export const LOGS_KEYBINDINGS: Record<LogsFocusedBox, Keybinding[]> = {
  history: [{ key: 'Space', label: 'Select' }],
  viewer: [
    { key: 'i', label: 'Add Entry' },
    { key: 'e', label: 'Edit' },
    { key: 'n', label: 'New Log', color: 'green' },
    { key: 'c', label: 'Standup' },
    { key: 'r', label: 'Refresh' }
  ]
};
