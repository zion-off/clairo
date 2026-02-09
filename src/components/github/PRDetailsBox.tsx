import open from 'open';
import { useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import {
  CHECK_COLORS,
  CHECK_ICONS,
  CHECK_SORT_ORDER,
  PRDetails,
  StatusCheck,
  resolveCheckStatus,
  resolveMergeDisplay,
  resolveReviewDisplay
} from '../../lib/github/index.js';
import Markdown from '../ui/Markdown.js';

type Props = {
  pr: PRDetails | null;
  loading: boolean;
  error?: string;
  isActive: boolean;
};

export default function PRDetailsBox({ pr, loading, error, isActive }: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);

  const title = '[3] PR Details';
  const borderColor = isActive ? 'yellow' : undefined;

  const displayTitle = pr ? `${title} - #${pr.number}` : title;

  const reviewDisplay = resolveReviewDisplay(pr?.reviewDecision ?? null);
  const mergeDisplay = resolveMergeDisplay(pr);

  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') {
        scrollRef.current?.scrollBy(-1);
      }
      if (key.downArrow || input === 'j') {
        scrollRef.current?.scrollBy(1);
      }
      if (input === 'o' && pr?.url) {
        open(pr.url).catch(() => {});
      }
    },
    { isActive }
  );

  // Get terminal width for responsive border
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  // Calculate width: this component takes ~half the terminal (left column)
  const columnWidth = Math.floor(terminalWidth / 2);
  const titlePart = `╭─ ${displayTitle} `;
  const dashCount = Math.max(0, columnWidth - titlePart.length - 1);
  const topBorder = `${titlePart}${'─'.repeat(dashCount)}╮`;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text color={borderColor}>{topBorder}</Text>
      <Box
        flexDirection="column"
        flexGrow={1}
        flexBasis={0}
        overflow="hidden"
        borderStyle="round"
        borderTop={false}
        borderColor={borderColor}
      >
        <ScrollView ref={scrollRef}>
          <Box flexDirection="column" paddingX={1}>
            {loading && <Text dimColor>Loading details...</Text>}
            {error && <Text color="red">{error}</Text>}
            {!loading && !error && !pr && <Text dimColor>Select a PR to view details</Text>}
            {!loading && !error && pr && (
              <>
                <Text bold>{pr.title}</Text>
                <Text dimColor>
                  by {pr.author?.login ?? 'unknown'} | {pr.commits?.length ?? 0} commits
                </Text>

                <Box marginTop={1}>
                  <Text dimColor>Review: </Text>
                  <Text color={reviewDisplay.color}>{reviewDisplay.text}</Text>
                  <Text> | </Text>
                  <Text dimColor>Status: </Text>
                  <Text color={mergeDisplay.color}>{mergeDisplay.text}</Text>
                </Box>

                {(pr.assignees?.length ?? 0) > 0 && (
                  <Box marginTop={1}>
                    <Text dimColor>Assignees: </Text>
                    <Text>{pr.assignees.map((a) => a.login).join(', ')}</Text>
                  </Box>
                )}

                {(pr.reviews?.length ?? 0) > 0 && (
                  <Box flexDirection="column">
                    <Text dimColor>Reviews:</Text>
                    {pr.reviews.map((review, idx) => {
                      const color =
                        review.state === 'APPROVED'
                          ? 'green'
                          : review.state === 'CHANGES_REQUESTED'
                          ? 'red'
                          : review.state === 'COMMENTED'
                          ? 'blue'
                          : 'yellow';
                      const icon =
                        review.state === 'APPROVED'
                          ? '✓'
                          : review.state === 'CHANGES_REQUESTED'
                          ? '✗'
                          : review.state === 'COMMENTED'
                          ? '💬'
                          : '○';
                      return (
                        <Text key={idx} color={color}>
                          {'  '}
                          {icon} {review.author.login}
                        </Text>
                      );
                    })}
                  </Box>
                )}

                {(pr.reviewRequests?.length ?? 0) > 0 && (
                  <Box>
                    <Text dimColor>Pending: </Text>
                    <Text color="yellow">
                      {pr.reviewRequests.map((r) => r.login ?? r.name ?? r.slug ?? 'Team').join(', ')}
                    </Text>
                  </Box>
                )}

                {(pr.statusCheckRollup?.length ?? 0) > 0 && (
                  <Box marginTop={1} flexDirection="column">
                    <Text dimColor>Checks:</Text>
                    {Array.from(
                      pr.statusCheckRollup
                        ?.reduce((acc, check) => {
                          const key = check.name ?? check.context ?? '';
                          const existing = acc.get(key);
                          // Keep the most recent run (by startedAt) for each check name
                          if (!existing || (check.startedAt ?? '') > (existing.startedAt ?? '')) {
                            acc.set(key, check);
                          }
                          return acc;
                        }, new Map<string, StatusCheck>())
                        .values() ?? []
                    )
                      .sort((a, b) => CHECK_SORT_ORDER[resolveCheckStatus(a)] - CHECK_SORT_ORDER[resolveCheckStatus(b)])
                      .map((check, idx) => {
                        const jobName = check.name ?? check.context;
                        const displayName = check.workflowName ? `${check.workflowName} / ${jobName}` : jobName;
                        const status = resolveCheckStatus(check);
                        return (
                          <Text key={idx} color={CHECK_COLORS[status]}>
                            {'  '}
                            {CHECK_ICONS[status]} {displayName}
                          </Text>
                        );
                      })}
                  </Box>
                )}

                {pr.body && (
                  <Box marginTop={1} flexDirection="column">
                    <Text dimColor>Description:</Text>
                    <Markdown>{pr.body}</Markdown>
                  </Box>
                )}
              </>
            )}
          </Box>
        </ScrollView>
      </Box>
    </Box>
  );
}
