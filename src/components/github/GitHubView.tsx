import { exec } from 'child_process';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { getSelectedRemote, updateRepoConfig } from '../../lib/github/config.js';
import { GitRemote, findRemoteWithBranch, getCurrentBranch, getRepoRoot, isGitRepo, listRemotes } from '../../lib/github/git.js';
import { PRDetails, PRListItem, getPRDetails, getRepoFromRemote, listPRsForBranch } from '../../lib/github/index.js';
import { getLinkedTickets } from '../../lib/jira/index.js';
import { logPRCreated } from '../../lib/logs/logger.js';
import { Keybinding } from '../ui/KeybindingsBar.js';
import PRDetailsBox from './PRDetailsBox.js';
import PullRequestsBox from './PullRequestsBox.js';
import RemotesBox from './RemotesBox.js';

type FocusedBox = 'remotes' | 'prs' | 'details';

type Props = {
  isFocused: boolean;
  onKeybindingsChange?: (bindings: Keybinding[]) => void;
  onLogUpdated?: () => void;
};

export default function GitHubView({ isFocused, onKeybindingsChange, onLogUpdated }: Props) {
  const [isRepo, setIsRepo] = useState<boolean | null>(null);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [currentRepoSlug, setCurrentRepoSlug] = useState<string | null>(null);

  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [selectedPR, setSelectedPR] = useState<PRListItem | null>(null);

  const [prs, setPrs] = useState<PRListItem[]>([]);
  const [prDetails, setPrDetails] = useState<PRDetails | null>(null);

  const [loading, setLoading] = useState({
    remotes: true,
    prs: false,
    details: false
  });
  const [errors, setErrors] = useState<{
    remotes?: string;
    prs?: string;
    details?: string;
  }>({});

  const [focusedBox, setFocusedBox] = useState<FocusedBox>('remotes');

  // Update keybindings based on focused box
  useEffect(() => {
    if (!isFocused) {
      onKeybindingsChange?.([]);
      return;
    }

    const bindings: Keybinding[] = [];

    if (focusedBox === 'remotes') {
      bindings.push({ key: 'Enter', label: 'Select Remote' });
    } else if (focusedBox === 'prs') {
      bindings.push({ key: 'n', label: 'New PR', color: 'green' });
      bindings.push({ key: 'r', label: 'Refresh' });
      bindings.push({ key: 'o', label: 'Open', color: 'green' });
      bindings.push({ key: 'y', label: 'Copy Link' });
    } else if (focusedBox === 'details') {
      bindings.push({ key: 'r', label: 'Refresh' });
      bindings.push({ key: 'o', label: 'Open', color: 'green' });
    }

    onKeybindingsChange?.(bindings);
  }, [isFocused, focusedBox, onKeybindingsChange]);

  useEffect(() => {
    const gitRepoCheck = isGitRepo();
    setIsRepo(gitRepoCheck);

    if (!gitRepoCheck) {
      setLoading((prev) => ({ ...prev, remotes: false }));
      setErrors((prev) => ({ ...prev, remotes: 'Not a git repository' }));
      return;
    }

    const rootResult = getRepoRoot();
    if (rootResult.success) {
      setRepoPath(rootResult.data);
    }

    const branchResult = getCurrentBranch();
    if (branchResult.success) {
      setCurrentBranch(branchResult.data);
    }

    const remotesResult = listRemotes();
    if (remotesResult.success) {
      setRemotes(remotesResult.data);
      const remoteNames = remotesResult.data.map((r) => r.name);
      const defaultRemote = getSelectedRemote(rootResult.success ? rootResult.data : '', remoteNames);
      setSelectedRemote(defaultRemote);
    } else {
      setErrors((prev) => ({ ...prev, remotes: remotesResult.error }));
    }

    setLoading((prev) => ({ ...prev, remotes: false }));
  }, []);

  const refreshPRs = useCallback(async () => {
    if (!currentBranch || !currentRepoSlug) return;

    setLoading((prev) => ({ ...prev, prs: true }));

    try {
      const result = await listPRsForBranch(currentBranch, currentRepoSlug);
      if (result.success) {
        setPrs(result.data);
        // Auto-select first PR if none selected
        if (result.data.length > 0) {
          setSelectedPR((prev) => prev ?? result.data[0]);
        }
        setErrors((prev) => ({ ...prev, prs: undefined }));
      } else {
        setErrors((prev) => ({ ...prev, prs: result.error }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, prs: String(err) }));
    } finally {
      setLoading((prev) => ({ ...prev, prs: false }));
    }
  }, [currentBranch, currentRepoSlug]);

  const refreshDetails = useCallback(async () => {
    if (!selectedPR || !currentRepoSlug) return;

    setLoading((prev) => ({ ...prev, details: true }));

    try {
      const result = await getPRDetails(selectedPR.number, currentRepoSlug);
      if (result.success) {
        setPrDetails(result.data);
        setErrors((prev) => ({ ...prev, details: undefined }));
      } else {
        setErrors((prev) => ({ ...prev, details: result.error }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, details: String(err) }));
    } finally {
      setLoading((prev) => ({ ...prev, details: false }));
    }
  }, [selectedPR, currentRepoSlug]);

  useEffect(() => {
    if (!selectedRemote || !currentBranch) return;

    const remote = remotes.find((r) => r.name === selectedRemote);
    if (!remote) return;

    const repo = getRepoFromRemote(remote.url);
    if (!repo) return;

    setCurrentRepoSlug(repo);
    setPrs([]);
    setSelectedPR(null);
  }, [selectedRemote, currentBranch, remotes]);

  useEffect(() => {
    if (currentRepoSlug && currentBranch) {
      refreshPRs();
    }
  }, [currentRepoSlug, currentBranch, refreshPRs]);

  useEffect(() => {
    if (!selectedPR || !currentRepoSlug) {
      setPrDetails(null);
      return;
    }
    refreshDetails();
  }, [selectedPR, currentRepoSlug, refreshDetails]);

  const handleRemoteSelect = useCallback(
    (remoteName: string) => {
      setSelectedRemote(remoteName);
      if (repoPath) {
        updateRepoConfig(repoPath, { selectedRemote: remoteName });
      }
    },
    [repoPath]
  );

  const handlePRSelect = useCallback((pr: PRListItem) => {
    setSelectedPR(pr);
  }, []);

  // Track PR numbers before creating a new PR
  const prNumbersBeforeCreate = useRef<Set<number>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleCreatePR = useCallback(() => {
    if (!currentBranch) {
      setErrors((prev) => ({ ...prev, prs: 'No branch detected' }));
      return;
    }

    // Find which remote has the branch pushed
    const remoteResult = findRemoteWithBranch(currentBranch);
    if (!remoteResult.success) {
      setErrors((prev) => ({ ...prev, prs: 'Push your branch to a remote first' }));
      return;
    }

    // Store current PR numbers before opening browser
    prNumbersBeforeCreate.current = new Set(prs.map((pr) => pr.number));

    // Open GitHub PR creation page in browser using gh CLI with --head flag for forks
    const headFlag = `${remoteResult.data.owner}:${currentBranch}`;
    exec(`gh pr create --web --head "${headFlag}"`, (error) => {
      // Emit resize to refresh TUI after returning from browser
      process.stdout.emit('resize');
      if (error) {
        setErrors((prev) => ({ ...prev, prs: `Failed to create PR: ${error.message}` }));
      }
    });

    // Start polling for new PRs (every 3 seconds, up to 2 minutes)
    if (!currentRepoSlug) return;

    let attempts = 0;
    const maxAttempts = 24; // 24 * 5 seconds = 2 minutes
    const pollInterval = 5000;

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }

      const result = await listPRsForBranch(currentBranch, currentRepoSlug);
      if (result.success) {
        setPrs(result.data);

        // Find newly created PR
        const newPR = result.data.find((pr) => !prNumbersBeforeCreate.current.has(pr.number));
        if (newPR) {
          // Stop polling - we found the new PR
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Get linked Jira tickets for logging
          const tickets = repoPath && currentBranch
            ? getLinkedTickets(repoPath, currentBranch).map((t) => t.key)
            : [];

          logPRCreated(newPR.number, newPR.title, tickets);
          onLogUpdated?.();
          setSelectedPR(newPR);
        }
      }
    }, pollInterval);
  }, [prs, currentBranch, currentRepoSlug, repoPath, onLogUpdated]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useInput(
    (input) => {
      if (input === '1') setFocusedBox('remotes');
      if (input === '2') setFocusedBox('prs');
      if (input === '3') setFocusedBox('details');
      if (input === 'r') {
        if (focusedBox === 'prs') refreshPRs();
        if (focusedBox === 'details') refreshDetails();
      }
      if (input === 'n' && focusedBox === 'prs') {
        handleCreatePR();
      }
    },
    { isActive: isFocused }
  );

  if (isRepo === false) {
    return (
      <TitledBox borderStyle="round" titles={['Error']} flexGrow={1}>
        <Text color="red">Current directory is not a git repository</Text>
      </TitledBox>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <RemotesBox
        remotes={remotes}
        selectedRemote={selectedRemote}
        onSelect={handleRemoteSelect}
        loading={loading.remotes}
        error={errors.remotes}
        isFocused={isFocused && focusedBox === 'remotes'}
      />
      <PullRequestsBox
        prs={prs}
        selectedPR={selectedPR}
        onSelect={handlePRSelect}
        onCreatePR={handleCreatePR}
        loading={loading.prs}
        error={errors.prs}
        branch={currentBranch}
        repoSlug={currentRepoSlug}
        isFocused={isFocused && focusedBox === 'prs'}
      />
      <PRDetailsBox
        pr={prDetails}
        loading={loading.details}
        error={errors.details}
        isFocused={isFocused && focusedBox === 'details'}
      />
    </Box>
  );
}
