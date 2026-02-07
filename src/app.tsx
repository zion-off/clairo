import { useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import GitHubView from './components/github/GitHubView.js';
import { JiraView } from './components/jira/index.js';
import KeybindingsBar, { Keybinding } from './components/ui/KeybindingsBar.js';

type FocusedView = 'github' | 'jira';

export default function App() {
  const { exit } = useApp();
  const [focusedView, setFocusedView] = useState<FocusedView>('github');
  const [modalOpen, setModalOpen] = useState(false);
  const [contextBindings, setContextBindings] = useState<Keybinding[]>([]);

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
    },
    { isActive: !modalOpen }
  );

  return (
    <Box flexGrow={1} flexDirection="column" overflow="hidden">
      <GitHubView
        isFocused={focusedView === 'github'}
        onKeybindingsChange={focusedView === 'github' ? setContextBindings : undefined}
      />
      <JiraView
        isFocused={focusedView === 'jira'}
        onModalChange={setModalOpen}
        onKeybindingsChange={focusedView === 'jira' ? setContextBindings : undefined}
      />
      <KeybindingsBar contextBindings={contextBindings} modalOpen={modalOpen} />
    </Box>
  );
}
