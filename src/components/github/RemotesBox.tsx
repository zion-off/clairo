import { useEffect, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { GitRemote } from '../../lib/github/git.js';

type Props = {
  remotes: GitRemote[];
  selectedRemote: string | null;
  onSelect: (name: string) => void;
  loading: boolean;
  error?: string;
  isFocused: boolean;
};

export default function RemotesBox({ remotes, selectedRemote, onSelect, loading, error, isFocused }: Props) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Sync highlight with selected remote
  useEffect(() => {
    const idx = remotes.findIndex((r) => r.name === selectedRemote);
    if (idx >= 0) setHighlightedIndex(idx);
  }, [selectedRemote, remotes]);

  useInput(
    (input, key) => {
      if (!isFocused || remotes.length === 0) return;

      if (key.upArrow || input === 'k') {
        setHighlightedIndex((prev) => Math.max(0, prev - 1));
      }
      if (key.downArrow || input === 'j') {
        setHighlightedIndex((prev) => Math.min(remotes.length - 1, prev + 1));
      }
      if (key.return) {
        onSelect(remotes[highlightedIndex].name);
      }
    },
    { isActive: isFocused }
  );

  const title = '[1] Remotes';
  const borderColor = isFocused ? 'yellow' : undefined;

  return (
    <TitledBox borderStyle="round" titles={[title]} borderColor={borderColor} flexShrink={0}>
      <Box flexDirection="column" paddingX={1} overflow="hidden">
        {loading && <Text dimColor>Loading...</Text>}
        {error && <Text color="red">{error}</Text>}
        {!loading && !error && remotes.length === 0 && <Text dimColor>No remotes configured</Text>}
        {!loading &&
          !error &&
          remotes.map((remote, idx) => {
            const isHighlighted = isFocused && idx === highlightedIndex;
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
      </Box>
    </TitledBox>
  );
}
