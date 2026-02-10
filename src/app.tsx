import { useCallback, useMemo, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useApp, useInput } from 'ink';
import GitHubView from './components/github/GitHubView.js';
import { JiraView } from './components/jira/index.js';
import { LogsView } from './components/logs/index.js';
import KeybindingsBar from './components/ui/KeybindingsBar.js';
import { GitHubFocusedBox } from './constants/github.js';
import { LogsFocusedBox } from './constants/logs.js';
import { COLUMN2_TABS, TabId } from './constants/tabs.js';
import { useRubberDuck } from './hooks/index.js';
import { FocusedView, JiraState, computeKeybindings } from './lib/keybindings.js';

export default function App() {
  const { exit } = useApp();
  const [focusedView, setFocusedView] = useState<FocusedView>('github');
  const [modalOpen, setModalOpen] = useState(false);
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('logs');
  const duck = useRubberDuck();

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
        tbd: {}
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
        setActiveTab('logs');
        setLogsFocusedBox('history');
      }
      if (input === '6') {
        setFocusedView('logs');
        setActiveTab('logs');
        setLogsFocusedBox('viewer');
      }
      if (key.tab) {
        setActiveTab((current) => {
          const idx = COLUMN2_TABS.findIndex((t) => t.id === current);
          const next = (idx + 1) % COLUMN2_TABS.length;
          const nextTab = COLUMN2_TABS[next]!;
          setFocusedView(nextTab.id);
          return nextTab.id;
        });
      }
      if (input === 'd') {
        duck.toggleDuck();
      }
      if (input === 'q' && duck.visible) {
        duck.quack();
      }
    },
    { isActive: !modalOpen }
  );

  return (
    <Box flexGrow={1} flexDirection="column" overflow="hidden">
      <Box height={1} flexDirection="row" columnGap={1}>
        <Box flexGrow={1} paddingX={1} flexBasis={0}>
          <Text color="gray">Current branch</Text>
        </Box>
        <Box flexGrow={1} gap={1} flexBasis={0}>
          <Text color="gray">Dashboards</Text>
          {COLUMN2_TABS.map((tab) => (
            <Text key={tab.id} bold dimColor={activeTab !== tab.id}>
              {tab.label}
            </Text>
          ))}
        </Box>
      </Box>
      <Box flexGrow={1} flexDirection="row" columnGap={1}>
        <Box flexDirection="column" flexGrow={1} flexBasis={0}>
          <GitHubView
            isActive={focusedView === 'github'}
            onFocusedBoxChange={setGithubFocusedBox}
            onLogUpdated={handleLogUpdated}
          />
          <JiraView
            isActive={focusedView === 'jira'}
            onModalChange={setModalOpen}
            onJiraStateChange={setJiraState}
            onLogUpdated={handleLogUpdated}
          />
        </Box>
        <Box flexDirection="column" flexGrow={1} flexBasis={0}>
          {activeTab === 'logs' && (
            <LogsView
              isActive={focusedView === 'logs'}
              refreshKey={logRefreshKey}
              focusedBox={logsFocusedBox}
              onFocusedBoxChange={setLogsFocusedBox}
            />
          )}
          {activeTab === 'tbd' && (
            <TitledBox borderStyle="round" titles={['TBD']} flexGrow={1}>
              <Box flexGrow={1} justifyContent="center" alignItems="center" paddingX={1}>
                <Text dimColor>Coming soon</Text>
              </Box>
            </TitledBox>
          )}
        </Box>
      </Box>
      <KeybindingsBar
        contextBindings={keybindings}
        modalOpen={modalOpen}
        duck={{ visible: duck.visible, message: duck.message }}
      />
    </Box>
  );
}
