import open from 'open';
import { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { copyToClipboard } from '../../lib/clipboard.js';
import { duckEvents } from '../../lib/duckEvents.js';
import { timeAgo } from '../../lib/github/index.js';
import { adfToMarkdown } from '../../lib/jira/adf-to-markdown.js';
import {
  JiraAuth,
  JiraComment,
  JiraIssueDetail,
  JiraTransition,
  applyTransition,
  assignIssue,
  getIssueDetail,
  getTransitions,
  unassignIssue
} from '../../lib/jira/index.js';
import { logJiraAssigneeChanged, logJiraStatusChanged } from '../../lib/logs/logger.js';
import Divider from '../ui/Divider.js';
import Markdown from '../ui/Markdown.js';

type Props = {
  issueKey: string;
  issueSummary: string;
  auth: JiraAuth;
  myAccountId: string | null;
  myDisplayName: string | null;
  isActive: boolean;
  onClose: () => void;
  onIssueUpdated: (
    key: string,
    updates: { status?: string; assignee?: { accountId: string; displayName: string } | null }
  ) => void;
  onLogUpdated?: () => void;
};

type Mode = 'normal' | 'transitions';

export default function JiraIssueDetailView({
  issueKey,
  issueSummary,
  auth,
  myAccountId,
  myDisplayName,
  isActive,
  onClose,
  onIssueUpdated,
  onLogUpdated
}: Props) {
  const scrollRef = useRef<ScrollViewRef>(null);
  const [detail, setDetail] = useState<JiraIssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('normal');
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [transitionsLoading, setTransitionsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch issue detail on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    getIssueDetail(auth, issueKey).then((result) => {
      if (result.success) {
        setDetail(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [issueKey, auth.siteUrl]);

  const getIssueUrl = () => `${auth.siteUrl}/browse/${issueKey}`;

  const openTransitionPicker = async () => {
    setTransitionsLoading(true);
    setActionError(null);
    const result = await getTransitions(auth, issueKey);
    if (result.success) {
      setTransitions(result.data);
      setMode('transitions');
    } else {
      setActionError(result.error);
    }
    setTransitionsLoading(false);
  };

  const handleTransitionSelect = async (item: { value: string; label: string }) => {
    setMode('normal');
    setActionLoading('Updating status...');
    setActionError(null);

    const result = await applyTransition(auth, issueKey, item.value);
    if (result.success) {
      const transition = transitions.find((t) => t.id === item.value);
      const newStatus = transition?.to.name ?? item.label;
      const oldStatus = detail?.fields.status.name ?? 'Unknown';

      // Update local state
      setDetail((prev) => (prev ? { ...prev, fields: { ...prev.fields, status: { name: newStatus } } } : prev));
      onIssueUpdated(issueKey, { status: newStatus });

      // Duck event + log
      duckEvents.emit('jira:transition');
      logJiraStatusChanged(issueKey, issueSummary, oldStatus, newStatus);
      onLogUpdated?.();
    } else {
      setActionError(result.error);
      duckEvents.emit('error');
    }
    setActionLoading(null);
  };

  const handleAssignToMe = async () => {
    if (!myAccountId || !myDisplayName) return;
    setActionLoading('Assigning...');
    setActionError(null);

    const result = await assignIssue(auth, issueKey, myAccountId);
    if (result.success) {
      const assignee = { accountId: myAccountId, displayName: myDisplayName };
      setDetail((prev) => (prev ? { ...prev, fields: { ...prev.fields, assignee } } : prev));
      onIssueUpdated(issueKey, { assignee });

      duckEvents.emit('jira:assigned');
      logJiraAssigneeChanged(issueKey, issueSummary, 'assigned', myDisplayName);
      onLogUpdated?.();
    } else {
      setActionError(result.error);
      duckEvents.emit('error');
    }
    setActionLoading(null);
  };

  const handleUnassign = async () => {
    setActionLoading('Unassigning...');
    setActionError(null);

    const result = await unassignIssue(auth, issueKey);
    if (result.success) {
      setDetail((prev) => (prev ? { ...prev, fields: { ...prev.fields, assignee: null } } : prev));
      onIssueUpdated(issueKey, { assignee: null });

      duckEvents.emit('jira:unassigned');
      logJiraAssigneeChanged(issueKey, issueSummary, 'unassigned');
      onLogUpdated?.();
    } else {
      setActionError(result.error);
      duckEvents.emit('error');
    }
    setActionLoading(null);
  };

  useInput(
    (input, key) => {
      if (mode === 'transitions') {
        if (key.escape) {
          setMode('normal');
        }
        // SelectInput handles j/k/Enter
        return;
      }

      // Normal mode
      if (key.escape && !actionLoading) {
        onClose();
        return;
      }
      if (key.upArrow || input === 'k') {
        scrollRef.current?.scrollBy(-1);
      }
      if (key.downArrow || input === 'j') {
        scrollRef.current?.scrollBy(1);
      }
      if (input === 'o') {
        open(getIssueUrl()).catch(() => {});
      }
      if (input === 'y') {
        copyToClipboard(getIssueUrl());
      }
      if (input === 's' && !actionLoading) {
        openTransitionPicker();
      }
      if (input === 'a' && !actionLoading && myAccountId) {
        handleAssignToMe();
      }
      if (input === 'A' && !actionLoading) {
        handleUnassign();
      }
    },
    { isActive }
  );

  const statusColor = getStatusColor(detail?.fields.status.name ?? '');
  const descriptionMd = detail?.fields.description ? adfToMarkdown(detail.fields.description) : null;
  const comments = detail?.fields.comment.comments ?? [];
  const totalComments = detail?.fields.comment.total ?? 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Scrollable content */}
      <Box flexGrow={1} flexBasis={0} overflow="hidden">
        {loading && (
          <Box paddingX={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Loading issue details...
            </Text>
          </Box>
        )}

        {error && (
          <Box paddingX={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}

        {!loading && !error && detail && (
          <ScrollView ref={scrollRef}>
            <Box flexDirection="column" paddingX={1}>
              {/* Header */}
              <Box>
                <Text bold color="blue">
                  {detail.key}
                </Text>
                <Text bold> {detail.fields.summary}</Text>
              </Box>
              <Box gap={1}>
                <Text dimColor>Status:</Text>
                <Text color={statusColor}>{detail.fields.status.name}</Text>
                <Text dimColor>Assignee:</Text>
                <Text>{detail.fields.assignee?.displayName ?? 'Unassigned'}</Text>
                <Text dimColor>Reporter:</Text>
                <Text>{detail.fields.reporter?.displayName ?? 'Unknown'}</Text>
              </Box>

              <Box marginTop={1}>
                <Divider />
              </Box>

              {/* Description */}
              <Box marginTop={1} flexDirection="column">
                <Text dimColor>Description:</Text>
                {descriptionMd ? (
                  <Markdown>{descriptionMd}</Markdown>
                ) : (
                  <Text dimColor italic>
                    No description
                  </Text>
                )}
              </Box>

              <Box marginTop={1}>
                <Divider />
              </Box>

              {/* Comments */}
              <Box marginTop={1} flexDirection="column">
                <Text dimColor>Comments ({totalComments}):</Text>
                {comments.length === 0 && (
                  <Text dimColor italic>
                    No comments
                  </Text>
                )}
                {comments.map((comment) => (
                  <CommentBlock key={comment.id} comment={comment} />
                ))}
                {comments.length < totalComments && (
                  <Box marginTop={1}>
                    <Text dimColor>
                      Showing {comments.length} of {totalComments} comments. Open in browser to see all.
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          </ScrollView>
        )}
      </Box>

      {/* Transition picker */}
      {mode === 'transitions' && (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text bold color="yellow">
            Change Status
          </Text>
          <SelectInput
            items={transitions.map((t) => ({ label: t.name, value: t.id }))}
            onSelect={handleTransitionSelect}
          />
          <Text dimColor>Esc to cancel</Text>
        </Box>
      )}

      {/* Footer */}
      <Box paddingX={1} flexDirection="column">
        {actionLoading && (
          <Text color="yellow">
            <Spinner type="dots" /> {actionLoading}
          </Text>
        )}
        {actionError && <Text color="red">{actionError}</Text>}
        {transitionsLoading && (
          <Text color="yellow">
            <Spinner type="dots" /> Loading transitions...
          </Text>
        )}
        {!actionLoading && !transitionsLoading && mode === 'normal' && (
          <Text dimColor>Esc close · j/k scroll · s status · a assign · A unassign · o open · y copy</Text>
        )}
      </Box>
    </Box>
  );
}

function CommentBlock({ comment }: { comment: JiraComment }) {
  const bodyMd = adfToMarkdown(comment.body);
  return (
    <Box marginTop={1} flexDirection="column">
      <Box gap={1}>
        <Text bold>{comment.author.displayName}</Text>
        <Text dimColor>{timeAgo(comment.created)}</Text>
      </Box>
      {bodyMd ? (
        <Markdown>{bodyMd}</Markdown>
      ) : (
        <Text dimColor italic>
          Empty comment
        </Text>
      )}
    </Box>
  );
}

function getStatusColor(status: string): string | undefined {
  const lower = status.toLowerCase();
  if (lower === 'done' || lower === 'closed' || lower === 'resolved') return 'green';
  if (lower === 'in progress' || lower === 'in review') return 'yellow';
  return 'gray';
}
