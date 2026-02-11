import { Keybinding } from '../components/ui/KeybindingsBar';

export type JiraState = 'not_configured' | 'no_tickets' | 'has_tickets';

export const JIRA_KEYBINDINGS: Record<JiraState, Keybinding[]> = {
  not_configured: [{ key: 'c', label: 'Configure Jira' }],
  no_tickets: [
    { key: 'l', label: 'Link Ticket' },
    { key: 'r', label: 'Remove Config', color: 'red' }
  ],
  has_tickets: [
    { key: 'l', label: 'Link' },
    { key: 's', label: 'Status' },
    { key: 'd', label: 'Unlink', color: 'red' },
    { key: 'o', label: 'Open', color: 'green' },
    { key: 'y', label: 'Copy Link' },
    { key: 'r', label: 'Remove Config', color: 'red' }
  ]
};
