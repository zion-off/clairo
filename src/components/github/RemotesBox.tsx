import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import { useListNavigation } from '../../hooks/index.js';
import { GitRemote } from '../../lib/github/git.js';

type Props = {
  remotes: GitRemote[];
  selectedRemote: string | null;
  onSelect: (name: string) => void;
  loading: boolean;
  error?: string;
  isActive: boolean;
};

export default function RemotesBox({ remotes, selectedRemote, onSelect, loading, error, isActive }: Props) {
  const selectedIndex = remotes.findIndex((r) => r.name === selectedRemote);

  const { highlightedIndex, scrollRef } = useListNavigation({
    items: remotes,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : undefined,
    onSelect: (index) => onSelect(remotes[index].name),
    isActive
  });

  const title = '[1] Remotes';
  const borderColor = isActive ? 'yellow' : undefined;

  return (
    <TitledBox borderStyle="round" titles={[title]} borderColor={borderColor} height={5}>
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {loading && <Text dimColor>Loading...</Text>}
        {error && <Text color="red">{error}</Text>}
        {!loading && !error && remotes.length === 0 && <Text dimColor>No remotes configured</Text>}
        {!loading && !error && remotes.length > 0 && (
          <ScrollView ref={scrollRef}>
            {remotes.map((remote, idx) => {
              const isHighlighted = isActive && idx === highlightedIndex;
              const isSelected = remote.name === selectedRemote;
              const cursor = isHighlighted ? '>' : ' ';
              const indicator = isSelected ? ' *' : '';
              return (
                <Box key={remote.name}>
                  <Text color={isHighlighted ? 'yellow' : undefined}>{cursor} </Text>
                  <Text color={isSelected ? 'green' : undefined}>
                    {remote.name} ({remote.url})
                  </Text>
                  <Text dimColor>{indicator}</Text>
                </Box>
              );
            })}
          </ScrollView>
        )}
      </Box>
    </TitledBox>
  );
}
