import { Box } from 'ink';
import GitHubView from './components/github/GitHubView';
import { TabItem, Tabs } from './components/ui/Tabs';

export default function App() {
  return (
    <Box flexGrow={1} flexDirection="column" overflow="hidden">
      <Tabs>
        <TabItem name="GitHub">
          <GitHubView />
        </TabItem>
      </Tabs>
    </Box>
  );
}
