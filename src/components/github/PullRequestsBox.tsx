import { useEffect, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { copyToClipboard } from '../../lib/clipboard.js';
import { PRListItem } from '../../lib/github/index.js';

type Props = {
  prs: PRListItem[];
  selectedPR: PRListItem | null;
  onSelect: (pr: PRListItem) => void;
  onCreatePR: () => void;
  loading: boolean;
  error?: string;
  branch: string | null;
  repoSlug: string | null;
  isFocused: boolean;
};

export default function PullRequestsBox({
  prs,
  selectedPR,
  onSelect,
  onCreatePR,
  loading,
  error,
  branch,
  repoSlug,
  isFocused
}: Props) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const totalItems = prs.length + 1; // PRs + "Create new PR"

  useEffect(() => {
    const idx = prs.findIndex((p) => p.number === selectedPR?.number);
    if (idx >= 0) setHighlightedIndex(idx);
  }, [selectedPR, prs]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.upArrow || input === 'k') {
        setHighlightedIndex((prev) => Math.max(0, prev - 1));
      }
      if (key.downArrow || input === 'j') {
        setHighlightedIndex((prev) => Math.min(totalItems - 1, prev + 1));
      }
      if (key.return) {
        if (highlightedIndex === prs.length) {
          onCreatePR();
        } else if (prs[highlightedIndex]) {
          onSelect(prs[highlightedIndex]);
        }
      }
      if (input === 'y' && repoSlug && prs[highlightedIndex]) {
        const pr = prs[highlightedIndex];
        const url = `https://github.com/${repoSlug}/pull/${pr.number}`;
        copyToClipboard(url);
      }
    },
    { isActive: isFocused }
  );

  const title = '[2] Pull Requests';
  const subtitle = branch ? ` (${branch})` : '';
  const borderColor = isFocused ? 'yellow' : undefined;

  return (
    <TitledBox borderStyle="round" titles={[`${title}${subtitle}`]} borderColor={borderColor} flexShrink={0}>
      <Box flexDirection="column" paddingX={1} overflow="hidden">
        {loading && <Text dimColor>Loading PRs...</Text>}
        {error && <Text color="red">{error}</Text>}
        {!loading && !error && (
          <>
            {prs.length === 0 && <Text dimColor>No PRs for this branch</Text>}
            {prs.map((pr, idx) => {
              const isHighlighted = isFocused && idx === highlightedIndex;
              const isSelected = pr.number === selectedPR?.number;
              const cursor = isHighlighted ? '>' : ' ';
              const indicator = isSelected ? ' *' : '';
              return (
                <Box key={pr.number}>
                  <Text color={isHighlighted ? 'yellow' : undefined}>{cursor} </Text>
                  <Text color={isSelected ? 'green' : undefined}>
                    #{pr.number} {pr.isDraft ? '[Draft] ' : ''}
                    {pr.title}
                  </Text>
                  <Text dimColor>{indicator}</Text>
                </Box>
              );
            })}
            <Text color="blue">{isFocused && highlightedIndex === prs.length ? '> ' : '  '}+ Create new PR</Text>
          </>
        )}
      </Box>
    </TitledBox>
  );
}
