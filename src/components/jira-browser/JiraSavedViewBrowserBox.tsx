import open from 'open';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import Spinner from 'ink-spinner';
import { useScrollToIndex } from '../../hooks/index.js';
import { copyToClipboard } from '../../lib/clipboard.js';
import { SavedJiraView } from '../../lib/config/index.js';
import { JiraAuth } from '../../lib/jira/api.js';
import { JiraSearchIssue, JiraSprint, fetchViewIssues } from '../../lib/jira/search.js';
import JiraIssueDetailView from './JiraIssueDetailView.js';

type AssigneeFilter = 'all' | 'unassigned' | 'me';

type Props = {
  view: SavedJiraView | null;
  auth: JiraAuth | null;
  myAccountId: string | null;
  myDisplayName: string | null;
  isActive: boolean;
  onInputModeChange?: (active: boolean) => void;
  onLogUpdated?: () => void;
};

type SprintGroup = {
  sprint: JiraSprint | null;
  issues: JiraSearchIssue[];
};

function groupBySprint(issues: JiraSearchIssue[]): SprintGroup[] {
  const groups = new Map<string, { sprint: JiraSprint | null; issues: JiraSearchIssue[] }>();

  for (const issue of issues) {
    const sprint = issue.fields.sprint ?? null;
    const key = sprint ? String(sprint.id) : '__backlog__';

    if (!groups.has(key)) {
      groups.set(key, { sprint, issues: [] });
    }
    groups.get(key)!.issues.push(issue);
  }

  const stateOrder: Record<string, number> = { active: 0, future: 1, closed: 2 };
  const entries = [...groups.values()];
  entries.sort((a, b) => {
    if (!a.sprint) return 1;
    if (!b.sprint) return -1;
    const aOrder = stateOrder[a.sprint.state] ?? 3;
    const bOrder = stateOrder[b.sprint.state] ?? 3;
    return aOrder - bOrder;
  });

  return entries;
}

type Row = { type: 'header'; label: string; state: string | null } | { type: 'issue'; issue: JiraSearchIssue };

function buildRows(groups: SprintGroup[]): Row[] {
  const hasSprints = groups.some((g) => g.sprint !== null);
  if (!hasSprints) {
    return groups.flatMap((g) => g.issues.map((issue) => ({ type: 'issue' as const, issue })));
  }

  const rows: Row[] = [];
  for (const group of groups) {
    const label = group.sprint ? group.sprint.name : 'Backlog';
    const state = group.sprint?.state ?? null;
    rows.push({ type: 'header', label, state });
    for (const issue of group.issues) {
      rows.push({ type: 'issue', issue });
    }
  }
  return rows;
}

export default function JiraSavedViewBrowserBox({
  view,
  auth,
  myAccountId,
  myDisplayName,
  isActive,
  onInputModeChange,
  onLogUpdated
}: Props) {
  const [issues, setIssues] = useState<JiraSearchIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [detailIssue, setDetailIssue] = useState<{ key: string; summary: string } | null>(null);

  useEffect(() => {
    onInputModeChange?.(isFiltering || detailIssue !== null);
  }, [isFiltering, detailIssue, onInputModeChange]);

  const title = '[6] Issues';
  const borderColor = isActive ? 'yellow' : undefined;
  const displayTitle = view ? `${title} - ${view.name}` : title;

  // Apply client-side assignee filter only (text search is server-side)
  const filteredIssues = useMemo(() => {
    if (assigneeFilter === 'unassigned') {
      return issues.filter((issue) => !issue.fields.assignee);
    }
    if (assigneeFilter === 'me' && myAccountId) {
      return issues.filter((issue) => issue.fields.assignee?.accountId === myAccountId);
    }
    return issues;
  }, [issues, assigneeFilter, myAccountId]);

  // Group and build rows
  const rows = useMemo(() => {
    const groups = groupBySprint(filteredIssues);
    return buildRows(groups);
  }, [filteredIssues]);

  // Navigable indices are only issue rows
  const navigableIndices = useMemo(
    () => rows.map((r, i) => (r.type === 'issue' ? i : -1)).filter((i) => i >= 0),
    [rows]
  );

  const scrollRef = useScrollToIndex(navigableIndices.length > 0 ? navigableIndices[highlightedIndex] ?? 0 : 0);

  const currentIssue = useMemo(() => {
    if (navigableIndices.length === 0) return null;
    const rowIdx = navigableIndices[highlightedIndex];
    if (rowIdx === undefined) return null;
    const row = rows[rowIdx];
    return row?.type === 'issue' ? row.issue : null;
  }, [rows, navigableIndices, highlightedIndex]);

  const hasMore = issues.length < total;

  const doFetch = useCallback(
    async (search: string, startAt = 0, append = false) => {
      if (!view || !auth) return;
      setLoading(true);
      setError(null);

      const result = await fetchViewIssues(auth, view, {
        startAt,
        maxResults: 50,
        searchText: search || undefined
      });
      if (result.success) {
        setIssues((prev) => (append ? [...prev, ...result.data.issues] : result.data.issues));
        setTotal(result.data.total);
        if (!append) setHighlightedIndex(0);
      } else {
        setError(result.error);
        if (!append) {
          setIssues([]);
          setTotal(0);
        }
      }
      setLoading(false);
    },
    [view, auth]
  );

  // Fetch when view changes
  useEffect(() => {
    if (view && auth) {
      setSearchText('');
      setInputText('');
      doFetch('');
    } else {
      setIssues([]);
      setTotal(0);
      setError(null);
    }
  }, [view?.id, auth?.siteUrl]);

  const getIssueUrl = (issue: JiraSearchIssue) => {
    if (!auth) return null;
    return `${auth.siteUrl}/browse/${issue.key}`;
  };

  const handleIssueUpdated = useCallback(
    (key: string, updates: { status?: string; assignee?: { accountId: string; displayName: string } | null }) => {
      setIssues((prev) =>
        prev.map((issue) => {
          if (issue.key !== key) return issue;
          const updated = { ...issue, fields: { ...issue.fields } };
          if (updates.status !== undefined) {
            updated.fields.status = { name: updates.status };
          }
          if ('assignee' in updates) {
            updated.fields.assignee = updates.assignee;
          }
          return updated;
        })
      );
    },
    []
  );

  const hasActiveFilters = searchText.length > 0 || assigneeFilter !== 'all';

  useInput(
    (input, key) => {
      // Detail view handles its own input
      if (detailIssue) return;

      // Filter mode handling
      if (isFiltering) {
        if (key.escape) {
          setIsFiltering(false);
          setInputText(searchText);
          return;
        }
        if (key.return) {
          setIsFiltering(false);
          const newSearch = inputText.trim();
          if (newSearch !== searchText) {
            setSearchText(newSearch);
            doFetch(newSearch);
          }
          return;
        }
        if (key.backspace || key.delete) {
          setInputText((prev) => prev.slice(0, -1));
          return;
        }
        if (input && input.length > 0) {
          const printable = input.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
          if (printable.length > 0) {
            setInputText((prev) => prev + printable);
          }
          return;
        }
        return;
      }

      // Normal mode
      if (navigableIndices.length > 0) {
        if (key.upArrow || input === 'k') {
          setHighlightedIndex((i) => Math.max(0, i - 1));
        }
        if (key.downArrow || input === 'j') {
          setHighlightedIndex((i) => Math.min(navigableIndices.length - 1, i + 1));
        }
        if (input === 'o' && currentIssue) {
          const url = getIssueUrl(currentIssue);
          if (url) open(url).catch(() => {});
        }
        if (input === 'y' && currentIssue) {
          const url = getIssueUrl(currentIssue);
          if (url) copyToClipboard(url);
        }
        if (key.return && currentIssue && auth) {
          setDetailIssue({ key: currentIssue.key, summary: currentIssue.fields.summary });
        }
      }

      if (input === '/') {
        setIsFiltering(true);
        setInputText(searchText);
        return;
      }
      if (input === 'u') {
        setAssigneeFilter((f) => (f === 'unassigned' ? 'all' : 'unassigned'));
        setHighlightedIndex(0);
        return;
      }
      if (input === 'm') {
        setAssigneeFilter((f) => (f === 'me' ? 'all' : 'me'));
        setHighlightedIndex(0);
        return;
      }
      if (input === 'x') {
        setAssigneeFilter('all');
        if (searchText) {
          setSearchText('');
          setInputText('');
          doFetch('');
        }
        setHighlightedIndex(0);
        return;
      }
      if (input === 'l' && hasMore) {
        doFetch(searchText, issues.length, true);
        return;
      }
      if (input === 'r') {
        doFetch(searchText);
      }
    },
    { isActive }
  );

  // Build filter status line
  const filterParts: string[] = [];
  if (assigneeFilter === 'unassigned') filterParts.push('unassigned');
  if (assigneeFilter === 'me') filterParts.push('mine');
  if (searchText) filterParts.push(`"${searchText}"`);

  return (
    <TitledBox borderStyle="round" titles={[displayTitle]} borderColor={borderColor} flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
        {detailIssue && auth ? (
          <JiraIssueDetailView
            issueKey={detailIssue.key}
            issueSummary={detailIssue.summary}
            auth={auth}
            myAccountId={myAccountId}
            myDisplayName={myDisplayName}
            isActive={isActive}
            onClose={() => setDetailIssue(null)}
            onIssueUpdated={handleIssueUpdated}
            onLogUpdated={onLogUpdated}
          />
        ) : (
          <>
            {/* Filter bar */}
            {(isFiltering || hasActiveFilters) && (
              <Box paddingX={1}>
                <Text color="blue">Search: </Text>
                {isFiltering ? (
                  <>
                    <Text>{inputText}</Text>
                    <Text backgroundColor="yellow"> </Text>
                  </>
                ) : (
                  <>
                    <Text>{filterParts.join(' + ')}</Text>
                    <Text dimColor>
                      {' '}
                      ({filteredIssues.length}/{total})
                    </Text>
                  </>
                )}
              </Box>
            )}

            {/* Content */}
            <Box flexGrow={1} flexBasis={0} overflow="hidden">
              {!view && (
                <Box paddingX={1}>
                  <Text dimColor>Select a view to browse issues</Text>
                </Box>
              )}

              {view && loading && issues.length === 0 && (
                <Box paddingX={1}>
                  <Text color="yellow">
                    <Spinner type="dots" /> Loading issues...
                  </Text>
                </Box>
              )}

              {view && error && (
                <Box paddingX={1}>
                  <Text color="red">{error}</Text>
                </Box>
              )}

              {view && !loading && !error && issues.length === 0 && (
                <Box paddingX={1}>
                  <Text dimColor>{searchText ? 'No issues match search' : 'No issues found'}</Text>
                </Box>
              )}

              {view && !loading && !error && filteredIssues.length === 0 && issues.length > 0 && (
                <Box paddingX={1}>
                  <Text dimColor>No issues match filter</Text>
                </Box>
              )}

              {rows.length > 0 && (
                <ScrollView ref={scrollRef}>
                  {rows.map((row, rowIdx) => {
                    if (row.type === 'header') {
                      const stateLabel = row.state === 'active' ? ' (active)' : '';
                      return (
                        <Box key={`header-${row.label}`} paddingX={1} marginTop={rowIdx > 0 ? 1 : 0}>
                          <Text bold color="magenta">
                            {row.label}
                            {stateLabel && <Text dimColor>{stateLabel}</Text>}
                          </Text>
                        </Box>
                      );
                    }

                    const navIdx = navigableIndices.indexOf(rowIdx);
                    const isHighlighted = navIdx === highlightedIndex;
                    const cursor = isHighlighted ? '>' : ' ';
                    const statusColor = getStatusColor(row.issue.fields.status.name);

                    return (
                      <Box key={row.issue.key} paddingX={1}>
                        <Text color={isHighlighted ? 'yellow' : undefined}>{cursor} </Text>
                        <Text bold color="blue">
                          {row.issue.key}
                        </Text>
                        <Text> {row.issue.fields.summary}</Text>
                        <Text color={statusColor}> [{row.issue.fields.status.name}]</Text>
                      </Box>
                    );
                  })}
                </ScrollView>
              )}
            </Box>

            {/* Footer */}
            {view && !loading && issues.length > 0 && (
              <Box paddingX={1}>
                <Text dimColor>
                  {issues.length} of {total} loaded
                  {hasMore && ' · l to load more'}
                </Text>
              </Box>
            )}
            {view && loading && issues.length > 0 && (
              <Box paddingX={1}>
                <Text dimColor>Loading more...</Text>
              </Box>
            )}
          </>
        )}
      </Box>
    </TitledBox>
  );
}

function getStatusColor(status: string): string | undefined {
  const lower = status.toLowerCase();
  if (lower === 'done' || lower === 'closed' || lower === 'resolved') return 'green';
  if (lower === 'in progress' || lower === 'in review') return 'yellow';
  return 'gray';
}
