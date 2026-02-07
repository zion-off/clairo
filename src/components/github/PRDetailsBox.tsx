import { useRef } from 'react';
import open from 'open';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import { PRDetails, StatusCheck } from '../../lib/github/index.js';
import Markdown from '../ui/Markdown.js';

type Props = {
  pr: PRDetails | null;
  loading: boolean;
  error?: string;
  isFocused: boolean;
};

function getCheckColor(check: StatusCheck): string | undefined {
  const conclusion = check.conclusion ?? check.state;
  if (conclusion === 'SUCCESS') return 'green';
  if (conclusion === 'FAILURE' || conclusion === 'ERROR') return 'red';
  if (conclusion === 'SKIPPED' || conclusion === 'NEUTRAL') return 'gray';
  if (
    conclusion === 'PENDING' ||
    check.status === 'IN_PROGRESS' ||
    check.status === 'QUEUED' ||
    check.status === 'WAITING'
  )
    return 'yellow';
  if (check.status === 'COMPLETED') return 'green';
  return undefined;
}

function getCheckIcon(check: StatusCheck): string {
  const conclusion = check.conclusion ?? check.state;
  if (conclusion === 'SUCCESS') return '✓';
  if (conclusion === 'FAILURE' || conclusion === 'ERROR') return '✗';
  if (conclusion === 'SKIPPED' || conclusion === 'NEUTRAL') return '○';
  if (
    conclusion === 'PENDING' ||
    check.status === 'IN_PROGRESS' ||
    check.status === 'QUEUED' ||
    check.status === 'WAITING'
  )
    return '●';
  if (check.status === 'COMPLETED') return '✓';
  return '?';
}

export default function PRDetailsBox({ pr, loading, error, isFocused }: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);

  const title = '[3] PR Details';
  const borderColor = isFocused ? 'yellow' : undefined;

  const displayTitle = pr ? `${title} - #${pr.number}` : title;

  const reviewStatus = pr?.reviewDecision ?? 'PENDING';
  const reviewColor = reviewStatus === 'APPROVED' ? 'green' : reviewStatus === 'CHANGES_REQUESTED' ? 'red' : 'yellow';

  // For merged/closed PRs, show state instead of mergeable status
  const getMergeDisplay = () => {
    if (!pr) return { text: 'UNKNOWN', color: 'yellow' };
    if (pr.state === 'MERGED') return { text: 'MERGED', color: 'magenta' };
    if (pr.state === 'CLOSED') return { text: 'CLOSED', color: 'red' };
    if (pr.mergeable === 'MERGEABLE') return { text: 'MERGEABLE', color: 'green' };
    if (pr.mergeable === 'CONFLICTING') return { text: 'CONFLICTING', color: 'red' };
    return { text: pr.mergeable ?? 'UNKNOWN', color: 'yellow' };
  };
  const mergeDisplay = getMergeDisplay();

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
    { isActive: isFocused }
  );

  return (
    <TitledBox borderStyle="round" titles={[displayTitle]} borderColor={borderColor} flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
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
                <Text color={reviewColor}>{reviewStatus}</Text>
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
                    const color = review.state === 'APPROVED' ? 'green'
                      : review.state === 'CHANGES_REQUESTED' ? 'red'
                      : review.state === 'COMMENTED' ? 'blue'
                      : 'yellow';
                    const icon = review.state === 'APPROVED' ? '✓'
                      : review.state === 'CHANGES_REQUESTED' ? '✗'
                      : review.state === 'COMMENTED' ? '💬'
                      : '○';
                    return (
                      <Text key={idx} color={color}>
                        {'  '}{icon} {review.author.login}
                      </Text>
                    );
                  })}
                </Box>
              )}

              {(pr.reviewRequests?.length ?? 0) > 0 && (
                <Box>
                  <Text dimColor>Pending: </Text>
                  <Text color="yellow">{pr.reviewRequests.map((r) => r.login ?? r.name ?? r.slug ?? 'Team').join(', ')}</Text>
                </Box>
              )}

              {(pr.statusCheckRollup?.length ?? 0) > 0 && (
                <Box marginTop={1} flexDirection="column">
                  <Text dimColor>Checks:</Text>
                  {pr.statusCheckRollup?.map((check, idx) => (
                    <Text key={idx} color={getCheckColor(check)}>
                      {'  '}
                      {getCheckIcon(check)} {check.name ?? check.context}
                    </Text>
                  ))}
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
    </TitledBox>
  );
}
