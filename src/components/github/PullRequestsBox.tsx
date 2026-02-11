import open from 'open';
import { useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import Spinner from 'ink-spinner';
import { useListNavigation } from '../../hooks/index';
import { copyToClipboard } from '../../lib/clipboard';
import { PRListItem } from '../../lib/github/index';

type Props = {
  prs: PRListItem[];
  selectedPR: PRListItem | null;
  onSelect: (pr: PRListItem) => void;
  onCreatePR: () => void;
  loading: boolean;
  error?: string;
  branch: string | null;
  repoSlug: string | null;
  isActive: boolean;
  isGeneratingPR?: boolean;
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
  isActive,
  isGeneratingPR
}: Props) {
  const [copied, setCopied] = useState(false);
  const selectedIndex = prs.findIndex((p) => p.number === selectedPR?.number);

  const { highlightedIndex, scrollRef } = useListNavigation({
    items: prs,
    totalItems: prs.length + 1,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : undefined,
    onSelect: (index) => {
      if (index === prs.length) {
        onCreatePR();
      } else if (prs[index]) {
        onSelect(prs[index]);
      }
    },
    isActive: isActive
  });

  useInput(
    (input) => {
      if (input === 'y' && repoSlug && prs[highlightedIndex]) {
        const pr = prs[highlightedIndex];
        const url = `https://github.com/${repoSlug}/pull/${pr.number}`;
        copyToClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
      if (input === 'o' && repoSlug && prs[highlightedIndex]) {
        const pr = prs[highlightedIndex];
        const url = `https://github.com/${repoSlug}/pull/${pr.number}`;
        open(url).catch(() => {});
      }
    },
    { isActive: isActive }
  );

  const title = '[2] Pull Requests';
  const subtitle = branch ? ` (${branch})` : '';
  const copiedIndicator = copied ? ' [Copied!]' : '';
  const borderColor = isActive ? 'yellow' : undefined;

  return (
    <TitledBox
      borderStyle="round"
      titles={[`${title}${subtitle}${copiedIndicator}`]}
      borderColor={borderColor}
      height={5}
    >
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {loading && <Text dimColor>Loading PRs...</Text>}
        {error && <Text color="red">{error}</Text>}
        {isGeneratingPR && (
          <Text color="yellow">
            <Spinner type="dots" /> Generating PR with Claude... (Esc to cancel)
          </Text>
        )}
        {!loading && !error && (
          <ScrollView ref={scrollRef}>
            {prs.length === 0 && (
              <Text key="empty" dimColor>
                No PRs for this branch
              </Text>
            )}
            {prs.map((pr, idx) => {
              const isHighlighted = isActive && idx === highlightedIndex;
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
            <Text key="create" color="blue">
              {isActive && highlightedIndex === prs.length ? '> ' : '  '}+ Create new PR
            </Text>
          </ScrollView>
        )}
      </Box>
    </TitledBox>
  );
}
