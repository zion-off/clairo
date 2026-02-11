import { useCallback, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import GitHubView from './components/github/GitHubView';
import { JiraBrowserView } from './components/jira-browser/index';
import { JiraView } from './components/jira/index';
import { LogsView } from './components/logs/index';
import { AllPullRequestsView } from './components/pull-requests/index';
import KeybindingsBar from './components/ui/KeybindingsBar';
import { GitHubFocusedBox } from './constants/github';
import { JiraBrowserFocusedBox } from './constants/jira-browser';
import { LogsFocusedBox } from './constants/logs';
import { COLUMN2_TABS, TabId } from './constants/tabs';
import { useRubberDuck } from './hooks/index';
import { FocusedView, JiraState, computeKeybindings } from './lib/keybindings';

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
  const [jiraBrowserFocusedBox, setJiraBrowserFocusedBox] = useState<JiraBrowserFocusedBox>('saved-views');
  const [jiraBrowserModalOpen, setJiraBrowserModalOpen] = useState(false);
  const [pullRequestsModalOpen, setPullRequestsModalOpen] = useState(false);

  // Compute keybindings from view state
  const keybindings = useMemo(
    () =>
      computeKeybindings(focusedView, {
        github: { focusedBox: githubFocusedBox },
        jira: { jiraState, modalOpen },
        logs: { focusedBox: logsFocusedBox },
        'jira-browser': { focusedBox: jiraBrowserFocusedBox, modalOpen: jiraBrowserModalOpen },
        'pull-requests': { modalOpen: pullRequestsModalOpen }
      }),
    [
      focusedView,
      githubFocusedBox,
      jiraState,
      modalOpen,
      logsFocusedBox,
      jiraBrowserFocusedBox,
      jiraBrowserModalOpen,
      pullRequestsModalOpen
    ]
  );

  const handleLogUpdated = useCallback(() => {
    setLogRefreshKey((prev) => prev + 1);
  }, []);

  const anyModalOpen = modalOpen || jiraBrowserModalOpen || pullRequestsModalOpen;

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
        setFocusedView(activeTab);
        if (activeTab === 'logs') setLogsFocusedBox('history');
        if (activeTab === 'jira-browser') setJiraBrowserFocusedBox('saved-views');
      }
      if (input === '6') {
        setFocusedView(activeTab);
        if (activeTab === 'logs') setLogsFocusedBox('viewer');
        if (activeTab === 'jira-browser') setJiraBrowserFocusedBox('browser');
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
    { isActive: !anyModalOpen }
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
          {activeTab === 'jira-browser' && (
            <JiraBrowserView
              isActive={focusedView === 'jira-browser'}
              focusedBox={jiraBrowserFocusedBox}
              onFocusedBoxChange={setJiraBrowserFocusedBox}
              onModalChange={setJiraBrowserModalOpen}
              onLogUpdated={handleLogUpdated}
            />
          )}
          {activeTab === 'pull-requests' && (
            <AllPullRequestsView isActive={focusedView === 'pull-requests'} onModalChange={setPullRequestsModalOpen} />
          )}
        </Box>
      </Box>
      <KeybindingsBar
        contextBindings={keybindings}
        modalOpen={anyModalOpen}
        duck={{ visible: duck.visible, message: duck.message }}
      />
    </Box>
  );
}
