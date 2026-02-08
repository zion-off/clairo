import { useCallback, useMemo, useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import GitHubView from './components/github/GitHubView.js';
import { JiraView } from './components/jira/index.js';
import { LogsView } from './components/logs/index.js';
import KeybindingsBar from './components/ui/KeybindingsBar.js';
import { GitHubFocusedBox } from './constants/github.js';
import { LogsFocusedBox } from './constants/logs.js';
import { computeKeybindings, FocusedView, JiraState } from './lib/keybindings.js';

export default function App() {
  const { exit } = useApp();
  const [focusedView, setFocusedView] = useState<FocusedView>('github');
  const [modalOpen, setModalOpen] = useState(false);
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  // View state for keybindings computation
  const [githubFocusedBox, setGithubFocusedBox] = useState<GitHubFocusedBox>('remotes');
  const [jiraState, setJiraState] = useState<JiraState>('not_configured');
  const [logsFocusedBox, setLogsFocusedBox] = useState<LogsFocusedBox>('history');

  // Compute keybindings from view state
  const keybindings = useMemo(
    () =>
      computeKeybindings(focusedView, {
        github: { focusedBox: githubFocusedBox },
        jira: { jiraState, modalOpen },
        logs: { focusedBox: logsFocusedBox },
      }),
    [focusedView, githubFocusedBox, jiraState, modalOpen, logsFocusedBox]
  );

  const handleLogUpdated = useCallback(() => {
    setLogRefreshKey((prev) => prev + 1);
  }, []);

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        exit();
      }
      if (input === '1' || input === '2' || input === '3') {
        setFocusedView('github');
      }
      if (input === '4') {
        setFocusedView('jira');
      }
      if (input === '5') {
        setFocusedView('logs');
        setLogsFocusedBox('history');
      }
      if (input === '6') {
        setFocusedView('logs');
        setLogsFocusedBox('viewer');
      }
    },
    { isActive: !modalOpen }
  );

  return (
    <Box flexGrow={1} flexDirection="column" overflow="hidden">
      <Box flexGrow={1} flexDirection="row" columnGap={1}>
        <Box flexDirection="column" flexGrow={1} flexBasis={0}>
          <GitHubView
            isFocused={focusedView === 'github'}
            onFocusedBoxChange={setGithubFocusedBox}
            onLogUpdated={handleLogUpdated}
          />
          <JiraView
            isFocused={focusedView === 'jira'}
            onModalChange={setModalOpen}
            onJiraStateChange={setJiraState}
            onLogUpdated={handleLogUpdated}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} flexBasis={0}>
          <LogsView
            isFocused={focusedView === 'logs'}
            refreshKey={logRefreshKey}
            focusedBox={logsFocusedBox}
            onFocusedBoxChange={setLogsFocusedBox}
          />
        </Box>
      </Box>
      <KeybindingsBar contextBindings={keybindings} modalOpen={modalOpen} />
    </Box>
  );
}
