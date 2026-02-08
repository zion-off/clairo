import { useCallback, useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import GitHubView from './components/github/GitHubView.js';
import { JiraView } from './components/jira/index.js';
import { LogsView } from './components/logs/index.js';
import KeybindingsBar, { Keybinding } from './components/ui/KeybindingsBar.js';
import { LogsFocusedBox } from './constants/logs.js';

type FocusedView = 'github' | 'jira' | 'logs';

export default function App() {
  const { exit } = useApp();
  const [focusedView, setFocusedView] = useState<FocusedView>('github');
  const [modalOpen, setModalOpen] = useState(false);
  const [contextBindings, setContextBindings] = useState<Keybinding[]>([]);
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const [logsFocusedBox, setLogsFocusedBox] = useState<LogsFocusedBox>('history');

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
            onKeybindingsChange={focusedView === 'github' ? setContextBindings : undefined}
            onLogUpdated={handleLogUpdated}
          />
          <JiraView
            isFocused={focusedView === 'jira'}
            onModalChange={setModalOpen}
            onKeybindingsChange={focusedView === 'jira' ? setContextBindings : undefined}
            onLogUpdated={handleLogUpdated}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} flexBasis={0}>
          <LogsView
            isFocused={focusedView === 'logs'}
            onKeybindingsChange={focusedView === 'logs' ? setContextBindings : undefined}
            refreshKey={logRefreshKey}
            focusedBox={logsFocusedBox}
            onFocusedBoxChange={setLogsFocusedBox}
          />
        </Box>
      </Box>
      <KeybindingsBar contextBindings={contextBindings} modalOpen={modalOpen} />
    </Box>
  );
}
