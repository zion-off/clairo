import open from 'open';
import React, { useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import Spinner from 'ink-spinner';
import {
  CHECK_COLORS,
  CHECK_ICONS,
  CHECK_SORT_ORDER,
  PRDetails,
  StatusCheck,
  buildTimeline,
  resolveCheckStatus,
  resolveMergeDisplay,
  resolveReviewDisplay,
  timeAgo
} from '../../lib/github/index';
import Badge from '../ui/Badge';
import Divider from '../ui/Divider';
import Markdown from '../ui/Markdown';
import TitledBox from '../ui/TitledBox';
import PRTimelineItem from './PRTimelineItem';

type Props = {
  pr: PRDetails | null;
  loading: boolean;
  error?: string;
  isActive: boolean;
  title?: string;
  footer?: React.ReactNode;
};

export default function PRDetailsBox({ pr, loading, error, isActive, title = '[3] PR Details', footer }: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);
  const borderColor = isActive ? 'yellow' : undefined;

  const displayTitle = pr ? `${title} - #${pr.number}` : title;

  const reviewDisplay = resolveReviewDisplay(pr?.reviewDecision ?? null);
  const mergeDisplay = resolveMergeDisplay(pr);
  const timeline = useMemo(() => (pr ? buildTimeline(pr) : []), [pr]);

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

  // Build sections array — dividers only render between non-empty sections
  const sections: Array<{ key: string; content: React.ReactNode }> = [];
  if (pr) {
    if ((pr.assignees?.length ?? 0) > 0) {
      sections.push({
        key: 'assignees',
        content: (
          <Box>
            <Text dimColor>Assignees: </Text>
            <Text>{pr.assignees.map((a) => a.login).join(', ')}</Text>
          </Box>
        )
      });
    }

    if ((pr.reviews?.length ?? 0) > 0 || (pr.reviewRequests?.length ?? 0) > 0) {
      sections.push({
        key: 'reviews',
        content: (
          <Box flexDirection="column">
            <Box>
              <Text dimColor>Reviews: </Text>
              <Text color={reviewDisplay.color}>{reviewDisplay.text}</Text>
            </Box>
            {pr.reviews?.map((review, idx) => {
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
                  ? '\uf00c'
                  : review.state === 'CHANGES_REQUESTED'
                  ? '\uf00d'
                  : review.state === 'COMMENTED'
                  ? '\uf075'
                  : '\uf10c';
              return (
                <Text key={idx} color={color}>
                  {'  '}
                  {icon} {review.author.login}
                </Text>
              );
            })}
            {pr.reviewRequests?.map((r, idx) => (
              <Text key={`pending-${idx}`} color="yellow">
                {'  '}○ {r.login ?? r.name ?? r.slug ?? 'Team'} <Text dimColor>(pending)</Text>
              </Text>
            ))}
          </Box>
        )
      });
    }

    if ((pr.statusCheckRollup?.length ?? 0) > 0) {
      sections.push({
        key: 'checks',
        content: (
          <Box flexDirection="column">
            <Text dimColor>Checks:</Text>
            {Array.from(
              pr.statusCheckRollup
                ?.reduce((acc, check) => {
                  const key = check.name ?? check.context ?? '';
                  const existing = acc.get(key);
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
        )
      });
    }

    if (pr.body) {
      sections.push({
        key: 'description',
        content: (
          <Box flexDirection="column">
            <Text dimColor>Description:</Text>
            <Markdown>{pr.body}</Markdown>
          </Box>
        )
      });
    }

    if (timeline.length > 0) {
      sections.push({
        key: 'timeline',
        content: (
          <Box flexDirection="column">
            <Text dimColor>Activity:</Text>
            {timeline.map((event, idx) => (
              <PRTimelineItem key={idx} event={event} />
            ))}
          </Box>
        )
      });
    }
  }

  return (
    <TitledBox title={displayTitle} borderColor={borderColor} footer={footer}>
      <Box flexDirection="column" flexGrow={1} flexBasis={0} overflow="hidden">
        <ScrollView ref={scrollRef}>
          <Box flexDirection="column" paddingX={1}>
            {loading && (
              <Text color="yellow">
                <Spinner type="dots" /> Loading details...
              </Text>
            )}
            {error && <Text color="red">{error}</Text>}
            {!loading && !error && !pr && <Text dimColor>Select a PR to view details</Text>}
            {!loading && !error && pr && (
              <>
                <Box>
                  <Text bold>{pr.title} </Text>
                  <Badge color="black" background={mergeDisplay.color}>
                    {mergeDisplay.text}
                  </Badge>
                </Box>
                <Box>
                  <Text dimColor>
                    {pr.baseRefName} ← {pr.headRefName} | by {pr.author?.login ?? 'unknown'} | {pr.commits?.length ?? 0}{' '}
                    commits{pr.createdAt && ` | opened ${timeAgo(pr.createdAt)}`} |{' '}
                  </Text>
                  <Text color="green">+{pr.additions}</Text>
                  <Text dimColor> </Text>
                  <Text color="red">-{pr.deletions}</Text>
                </Box>
                {(pr.labels?.length ?? 0) > 0 && (
                  <Box gap={1}>
                    {pr.labels.map((l) => (
                      <Box key={l.name}>
                        <Badge color="black" background="gray">
                          {l.name}
                        </Badge>
                      </Box>
                    ))}
                  </Box>
                )}

                {sections.map((section) => (
                  <React.Fragment key={section.key}>
                    <Box marginTop={1}>
                      <Divider />
                    </Box>
                    {section.content}
                  </React.Fragment>
                ))}
              </>
            )}
          </Box>
        </ScrollView>
      </Box>
    </TitledBox>
  );
}
