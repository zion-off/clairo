import { Keybinding } from '../components/ui/KeybindingsBar';
import { GITHUB_KEYBINDINGS, GitHubFocusedBox } from '../constants/github';
import { JIRA_KEYBINDINGS } from '../constants/jira';
import { JIRA_BROWSER_KEYBINDINGS, JiraBrowserFocusedBox } from '../constants/jira-browser';
import { LOGS_KEYBINDINGS, LogsFocusedBox } from '../constants/logs';
import { PULL_REQUESTS_KEYBINDINGS } from '../constants/pull-requests';

export type FocusedView = 'github' | 'jira' | 'logs' | 'jira-browser' | 'pull-requests';

export type JiraState = 'not_configured' | 'no_tickets' | 'has_tickets';

export type ViewKeyState = {
  github: { focusedBox: GitHubFocusedBox };
  jira: { jiraState: JiraState; modalOpen: boolean };
  logs: { focusedBox: LogsFocusedBox };
  'jira-browser': { focusedBox: JiraBrowserFocusedBox; modalOpen: boolean };
  'pull-requests': { modalOpen: boolean };
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

    case 'pull-requests':
      if (state['pull-requests'].modalOpen) return [];
      return PULL_REQUESTS_KEYBINDINGS;

    default:
      return [];
  }
}
