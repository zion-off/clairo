import { Keybinding } from '../components/ui/KeybindingsBar';

export type GitHubFocusedBox = 'remotes' | 'prs' | 'details';

export const GITHUB_KEYBINDINGS: Record<GitHubFocusedBox, Keybinding[]> = {
  remotes: [{ key: 'Space', label: 'Select Remote' }],
  prs: [
    { key: 'Space', label: 'Select' },
    { key: 'c', label: 'Generate PR', color: 'green' },
    { key: 'n', label: 'New PR', color: 'green' },
    { key: 'r', label: 'Refresh' },
    { key: 'o', label: 'Open', color: 'green' },
    { key: 'y', label: 'Copy Link' }
  ],
  details: [
    { key: 'r', label: 'Refresh' },
    { key: 'o', label: 'Open', color: 'green' }
  ]
};
