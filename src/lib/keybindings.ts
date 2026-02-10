import { Keybinding } from '../components/ui/KeybindingsBar.js';
import { GITHUB_KEYBINDINGS, GitHubFocusedBox } from '../constants/github.js';
import { JIRA_BROWSER_KEYBINDINGS, JiraBrowserFocusedBox } from '../constants/jira-browser.js';
import { JIRA_KEYBINDINGS } from '../constants/jira.js';
import { LOGS_KEYBINDINGS, LogsFocusedBox } from '../constants/logs.js';

export type FocusedView = 'github' | 'jira' | 'logs' | 'jira-browser';

export type JiraState = 'not_configured' | 'no_tickets' | 'has_tickets';

export type ViewKeyState = {
  github: { focusedBox: GitHubFocusedBox };
  jira: { jiraState: JiraState; modalOpen: boolean };
  logs: { focusedBox: LogsFocusedBox };
  'jira-browser': { focusedBox: JiraBrowserFocusedBox; modalOpen: boolean };
};

/**
 * Pure function to compute which keybindings should be displayed
 * based on the focused view and each view's state.
 */
export function computeKeybindings(focusedView: FocusedView, state: ViewKeyState): Keybinding[] {
  switch (focusedView) {
    case 'github':
      return GITHUB_KEYBINDINGS[state.github.focusedBox];

    case 'jira':
      if (state.jira.modalOpen) return [];
      return JIRA_KEYBINDINGS[state.jira.jiraState];

    case 'logs':
      return LOGS_KEYBINDINGS[state.logs.focusedBox];

    case 'jira-browser':
      if (state['jira-browser'].modalOpen) return [];
      return JIRA_BROWSER_KEYBINDINGS[state['jira-browser'].focusedBox];

    default:
      return [];
  }
}
