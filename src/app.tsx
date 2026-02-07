import { Box } from 'ink';
import GitHubView from './components/github/GitHubView';

export default function App() {
  return (
    <Box flexGrow={1} flexDirection="column" overflow="hidden">
      <GitHubView />
    </Box>
  );
}
