import { useCallback, useEffect, useRef, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import { GitHubFocusedBox } from '../../constants/github';
import { useGitRepo, usePullRequests } from '../../hooks/github/index';
import { ClaudeProcess, generatePRContent } from '../../lib/claude/index';
import { duckEvents } from '../../lib/duckEvents';
import { findRemoteWithBranch } from '../../lib/github/git';
import { editPRDescription, openPRCreationPage, openPRCreationPageWithContent } from '../../lib/github/index';
import { getJiraSiteUrl, getLinkedTickets } from '../../lib/jira/index';
import { logPRCreated } from '../../lib/logs/logger';
import PRDetailsBox from './PRDetailsBox';
import PullRequestsBox from './PullRequestsBox';
import RemotesBox from './RemotesBox';

type Props = {
  isActive: boolean;
  onFocusedBoxChange?: (box: GitHubFocusedBox) => void;
  onLogUpdated?: () => void;
};

export default function GitHubView({ isActive, onFocusedBoxChange, onLogUpdated }: Props) {
  const repo = useGitRepo();
  const pullRequests = usePullRequests();

  const [focusedBox, setFocusedBox] = useState<GitHubFocusedBox>('remotes');
  const [isGeneratingPR, setIsGeneratingPR] = useState(false);
  const claudeProcessRef = useRef<ClaudeProcess | null>(null);
  const previewScrollRef = useRef<ScrollViewRef>(null);
  const [prPreview, setPrPreview] = useState<{
    title: string;
    body: string;
    prNumber: number;
    repoSlug: string;
    branch: string;
  } | null>(null);

  // Effect to fetch PRs when repo data is ready or branch/repoSlug changes
  useEffect(() => {
    if (repo.loading || !repo.currentBranch || !repo.currentRepoSlug) return;
    pullRequests.fetchPRsAndDetails(repo.currentBranch, repo.currentRepoSlug);
  }, [repo.loading, repo.currentBranch, repo.currentRepoSlug, pullRequests.fetchPRsAndDetails]);

  // Refresh branch when view gains focus (detect external branch switches)
  useEffect(() => {
    if (isActive) {
      repo.refreshBranch();
    }
  }, [isActive, repo.refreshBranch]);

  // Notify parent of focused box changes
  useEffect(() => {
    onFocusedBoxChange?.(focusedBox);
  }, [focusedBox, onFocusedBoxChange]);

  // Handle remote selection - selectRemote updates currentRepoSlug, triggering the fetch effect
  const handleRemoteSelect = useCallback(
    (remoteName: string) => {
      repo.selectRemote(remoteName);
    },
    [repo.selectRemote]
  );

  // Handle PR selection
  const handlePRSelect = useCallback(
    (pr: Parameters<typeof pullRequests.selectPR>[0]) => {
      pullRequests.selectPR(pr, repo.currentRepoSlug);
    },
    [pullRequests.selectPR, repo.currentRepoSlug]
  );

  const onLogUpdatedRef = useRef(onLogUpdated);
  onLogUpdatedRef.current = onLogUpdated;

  const prsRef = useRef(pullRequests.prs);
  prsRef.current = pullRequests.prs;

  // Cancel in-flight Claude process on unmount
  useEffect(() => {
    return () => {
      claudeProcessRef.current?.cancel();
    };
  }, []);

  const handleAICreatePR = useCallback(() => {
    if (!repo.currentBranch || !repo.currentRepoSlug) {
      pullRequests.setError('prs', 'No branch or repo detected');
      duckEvents.emit('error');
      return;
    }

    const remoteResult = findRemoteWithBranch(repo.currentBranch);
    if (!remoteResult.success) {
      pullRequests.setError('prs', 'Push your branch to a remote first');
      duckEvents.emit('error');
      return;
    }

    setIsGeneratingPR(true);

    const repoSlug = repo.currentRepoSlug;
    const branch = repo.currentBranch;
    const repoPath = repo.repoPath;
    const owner = remoteResult.data.owner;

    const process = generatePRContent();
    claudeProcessRef.current = process;

    process.promise.then((result) => {
      claudeProcessRef.current = null;
      setIsGeneratingPR(false);

      if (!result.success) {
        if (result.error !== 'Cancelled') {
          pullRequests.setError('prs', result.error);
          duckEvents.emit('error');
        }
        return;
      }

      let title: string;
      let body: string;
      try {
        // Strip markdown code fences if present
        const cleaned = result.data
          .replace(/^```(?:json)?\s*\n?/m, '')
          .replace(/\n?```\s*$/m, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        title = parsed.title;
        body = parsed.body;
      } catch {
        pullRequests.setError('prs', 'Failed to parse AI response');
        duckEvents.emit('error');
        return;
      }

      // Prepend Jira context if tickets are linked
      const tickets = repoPath && branch ? getLinkedTickets(repoPath, branch) : [];
      if (tickets.length > 0) {
        const siteUrl = repoPath ? getJiraSiteUrl(repoPath) : null;
        const prefix = tickets.map((t) => t.key).join(' ');
        title = `${prefix} ${title}`;
        if (siteUrl) {
          const baseUrl = siteUrl.replace(/\/$/, '');
          const links = tickets.map((t) => `[${t.key}](${baseUrl}/browse/${t.key})`).join(', ');
          const label = tickets.length === 1 ? 'Ticket' : 'Tickets';
          body = `${label}: ${links}\n\n${body}`;
        }
      }

      const currentPrs = prsRef.current;
      const existingPR = currentPrs.length > 0 ? currentPrs[0] : null;

      if (existingPR) {
        // Show preview for user to accept or reject
        setPrPreview({ title, body, prNumber: existingPR.number, repoSlug, branch });
      } else {
        // New PR: open browser directly with generated content
        openPRCreationPageWithContent(owner, branch, title, body, (error) => {
          if (error) {
            pullRequests.setError('prs', `Failed to create PR: ${error.message}`);
            duckEvents.emit('error');
          }
        });

        pullRequests.pollForNewPR({
          branch,
          repoSlug,
          onNewPR: (newPR) => {
            const ticketKeys = repoPath && branch ? getLinkedTickets(repoPath, branch).map((t) => t.key) : [];
            logPRCreated(newPR.number, newPR.title, ticketKeys);
            duckEvents.emit('pr:opened', { prNumber: newPR.number, prTitle: newPR.title });
            onLogUpdatedRef.current?.();
          }
        });
      }
    });
  }, [repo.currentBranch, repo.currentRepoSlug, repo.repoPath, pullRequests.setError, pullRequests.pollForNewPR]);

  const handleCreatePR = useCallback(() => {
    if (!repo.currentBranch) {
      pullRequests.setError('prs', 'No branch detected');
      duckEvents.emit('error');
      return;
    }

    const remoteResult = findRemoteWithBranch(repo.currentBranch);
    if (!remoteResult.success) {
      pullRequests.setError('prs', 'Push your branch to a remote first');
      duckEvents.emit('error');
      return;
    }

    openPRCreationPage(remoteResult.data.owner, repo.currentBranch, (error) => {
      if (error) {
        pullRequests.setError('prs', `Failed to create PR: ${error.message}`);
        duckEvents.emit('error');
      }
    });

    if (!repo.currentRepoSlug) return;

    const repoPath = repo.repoPath;
    const branch = repo.currentBranch;
    const repoSlug = repo.currentRepoSlug;

    pullRequests.pollForNewPR({
      branch,
      repoSlug,
      onNewPR: (newPR) => {
        const tickets = repoPath && branch ? getLinkedTickets(repoPath, branch).map((t) => t.key) : [];
        logPRCreated(newPR.number, newPR.title, tickets);
        duckEvents.emit('pr:opened', { prNumber: newPR.number, prTitle: newPR.title });
        onLogUpdatedRef.current?.();
      }
    });
  }, [repo.currentBranch, repo.currentRepoSlug, repo.repoPath, pullRequests.setError, pullRequests.pollForNewPR]);

  useInput(
    (input, key) => {
      if (key.escape && isGeneratingPR) {
        claudeProcessRef.current?.cancel();
        claudeProcessRef.current = null;
        setIsGeneratingPR(false);
        return;
      }

      // Preview modal: scroll, Enter to apply, Esc to dismiss
      if (prPreview) {
        if (key.escape) {
          setPrPreview(null);
          return;
        }
        if (key.upArrow || input === 'k') {
          previewScrollRef.current?.scrollBy(-1);
          return;
        }
        if (key.downArrow || input === 'j') {
          previewScrollRef.current?.scrollBy(1);
          return;
        }
        if (key.return) {
          const { prNumber, repoSlug, branch, title, body } = prPreview;
          setPrPreview(null);
          editPRDescription(prNumber, repoSlug, title, body, (error) => {
            if (error) {
              pullRequests.setError('prs', `Failed to update PR: ${error.message}`);
              duckEvents.emit('error');
            } else {
              pullRequests.fetchPRsAndDetails(branch, repoSlug);
            }
          });
          return;
        }
        return;
      }

      if (input === '1') setFocusedBox('remotes');
      if (input === '2') setFocusedBox('prs');
      if (input === '3') setFocusedBox('details');
      if (input === 'r') {
        // Refresh branch first to detect external switches
        const freshBranch = repo.refreshBranch() ?? repo.currentBranch;
        if (focusedBox === 'prs' && freshBranch && repo.currentRepoSlug) {
          pullRequests.fetchPRsAndDetails(freshBranch, repo.currentRepoSlug);
        }
        if (focusedBox === 'details' && pullRequests.selectedPR && repo.currentRepoSlug) {
          pullRequests.refreshDetails(pullRequests.selectedPR, repo.currentRepoSlug);
        }
      }
      if (input === 'c' && focusedBox === 'prs' && !isGeneratingPR) {
        handleAICreatePR();
      }
      if (input === 'n' && focusedBox === 'prs') {
        handleCreatePR();
      }
    },
    { isActive: isActive }
  );

  if (repo.isRepo === false) {
    return (
      <TitledBox borderStyle="round" titles={['Error']} flexGrow={1}>
        <Text color="red">Current directory is not a git repository</Text>
      </TitledBox>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <RemotesBox
        remotes={repo.remotes}
        selectedRemote={repo.selectedRemote}
        onSelect={handleRemoteSelect}
        loading={repo.loading}
        error={repo.error}
        isActive={isActive && !prPreview && focusedBox === 'remotes'}
      />
      <PullRequestsBox
        prs={pullRequests.prs}
        selectedPR={pullRequests.selectedPR}
        onSelect={handlePRSelect}
        onCreatePR={handleCreatePR}
        loading={pullRequests.loading.prs}
        error={pullRequests.errors.prs}
        branch={repo.currentBranch}
        repoSlug={repo.currentRepoSlug}
        isActive={isActive && !prPreview && focusedBox === 'prs'}
        isGeneratingPR={isGeneratingPR}
      />
      <PRDetailsBox
        pr={pullRequests.prDetails}
        loading={pullRequests.loading.details}
        error={pullRequests.errors.details}
        isActive={isActive && !prPreview && focusedBox === 'details'}
      />
      {prPreview && (
        <TitledBox borderStyle="round" titles={['PR Preview']} borderColor="yellow" flexGrow={1} flexBasis={0}>
          <Box flexDirection="column" paddingX={1} flexGrow={1} flexBasis={0} overflow="hidden">
            <Box flexGrow={1} flexBasis={0} overflow="hidden">
              <ScrollView ref={previewScrollRef}>
                <Box flexDirection="column">
                  <Text bold>{prPreview.title}</Text>
                  <Text>{''}</Text>
                  <Text>{prPreview.body}</Text>
                </Box>
              </ScrollView>
            </Box>
            <Text dimColor>Enter to apply, Esc to dismiss, j/k to scroll</Text>
          </Box>
        </TitledBox>
      )}
    </Box>
  );
}
