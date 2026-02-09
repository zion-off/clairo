import { useCallback, useEffect, useRef, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { GitHubFocusedBox } from '../../constants/github.js';
import { useGitRepo, usePRPolling, usePullRequests } from '../../hooks/github/index.js';
import { duckEvents } from '../../lib/duckEvents.js';
import { findRemoteWithBranch } from '../../lib/github/git.js';
import { openPRCreationPage } from '../../lib/github/index.js';
import { getLinkedTickets } from '../../lib/jira/index.js';
import { logPRCreated } from '../../lib/logs/logger.js';
import PRDetailsBox from './PRDetailsBox.js';
import PullRequestsBox from './PullRequestsBox.js';
import RemotesBox from './RemotesBox.js';

type Props = {
  isFocused: boolean;
  onFocusedBoxChange?: (box: GitHubFocusedBox) => void;
  onLogUpdated?: () => void;
};

export default function GitHubView({ isFocused, onFocusedBoxChange, onLogUpdated }: Props) {
  const repo = useGitRepo();
  const pullRequests = usePullRequests();
  const polling = usePRPolling();

  const [focusedBox, setFocusedBox] = useState<GitHubFocusedBox>('remotes');

  // Effect to fetch PRs when repo data is ready or branch/repoSlug changes
  useEffect(() => {
    if (repo.loading || !repo.currentBranch || !repo.currentRepoSlug) return;
    pullRequests.fetchPRsAndDetails(repo.currentBranch, repo.currentRepoSlug);
  }, [repo.loading, repo.currentBranch, repo.currentRepoSlug, pullRequests.fetchPRsAndDetails]);

  // Refresh branch when view gains focus (detect external branch switches)
  useEffect(() => {
    if (isFocused) {
      repo.refreshBranch();
    }
  }, [isFocused, repo.refreshBranch]);

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

  // Store latest values in ref to avoid huge dependency array
  const createPRContext = useRef({ repo, pullRequests, onLogUpdated });
  createPRContext.current = { repo, pullRequests, onLogUpdated };

  const handleCreatePR = useCallback(() => {
    const { repo, pullRequests } = createPRContext.current;

    if (!repo.currentBranch) {
      pullRequests.setError('prs', 'No branch detected');
      duckEvents.emit('error');
      return;
    }

    // Find which remote has the branch pushed
    const remoteResult = findRemoteWithBranch(repo.currentBranch);
    if (!remoteResult.success) {
      pullRequests.setError('prs', 'Push your branch to a remote first');
      duckEvents.emit('error');
      return;
    }

    // Open GitHub PR creation page in browser
    openPRCreationPage(remoteResult.data.owner, repo.currentBranch, (error) => {
      if (error) {
        pullRequests.setError('prs', `Failed to create PR: ${error.message}`);
        duckEvents.emit('error');
      }
    });

    // Start polling for new PRs
    if (!repo.currentRepoSlug) return;

    polling.startPolling({
      branch: repo.currentBranch,
      repoSlug: repo.currentRepoSlug,
      existingPRNumbers: pullRequests.prs.map((pr) => pr.number),
      onPRsUpdated: (prs) => {
        pullRequests.setPrs(prs);
      },
      onNewPR: (newPR) => {
        const ctx = createPRContext.current;
        // Get linked Jira tickets for logging
        const tickets =
          ctx.repo.repoPath && ctx.repo.currentBranch
            ? getLinkedTickets(ctx.repo.repoPath, ctx.repo.currentBranch).map((t) => t.key)
            : [];

        logPRCreated(newPR.number, newPR.title, tickets);
        duckEvents.emit('pr:opened');
        ctx.onLogUpdated?.();
        ctx.pullRequests.setSelectedPR(newPR);
        // Fetch details for the new PR
        if (ctx.repo.currentRepoSlug) {
          ctx.pullRequests.refreshDetails(newPR, ctx.repo.currentRepoSlug);
        }
      }
    });
  }, [polling.startPolling]);

  useInput(
    (input) => {
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
      if (input === 'n' && focusedBox === 'prs') {
        handleCreatePR();
      }
    },
    { isActive: isFocused }
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
        isActive={isFocused && focusedBox === 'remotes'}
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
        isActive={isFocused && focusedBox === 'prs'}
      />
      <PRDetailsBox
        pr={pullRequests.prDetails}
        loading={pullRequests.loading.details}
        error={pullRequests.errors.details}
        isFocused={isFocused && focusedBox === 'details'}
      />
    </Box>
  );
}
