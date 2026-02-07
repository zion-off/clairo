import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text } from 'ink';
import { PRDetails, StatusCheck } from '../../lib/github/index.js';

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
  const title = '3 PR Details';
  const borderColor = isFocused ? 'cyan' : undefined;

  const displayTitle = pr ? `${title} - #${pr.number}` : title;

  const reviewStatus = pr?.reviewDecision ?? 'PENDING';
  const reviewColor = reviewStatus === 'APPROVED' ? 'green' : reviewStatus === 'CHANGES_REQUESTED' ? 'red' : 'yellow';

  const mergeableColor = pr?.mergeable === 'MERGEABLE' ? 'green' : pr?.mergeable === 'CONFLICTING' ? 'red' : 'yellow';

  return (
    <TitledBox borderStyle="round" titles={[displayTitle]} borderColor={borderColor} flexGrow={2}>
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
              <Text dimColor>Merge: </Text>
              <Text color={mergeableColor}>{pr.mergeable ?? 'UNKNOWN'}</Text>
            </Box>

            {(pr.assignees?.length ?? 0) > 0 && (
              <Box marginTop={1}>
                <Text dimColor>Assignees: </Text>
                <Text>{pr.assignees.map((a) => a.login).join(', ')}</Text>
              </Box>
            )}

            {(pr.reviewRequests?.length ?? 0) > 0 && (
              <Box>
                <Text dimColor>Reviewers: </Text>
                <Text>{pr.reviewRequests.map((r) => r.login ?? r.name ?? r.slug ?? 'Team').join(', ')}</Text>
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
                <Text>{pr.body}</Text>
              </Box>
            )}
          </>
        )}
      </Box>
    </TitledBox>
  );
}
