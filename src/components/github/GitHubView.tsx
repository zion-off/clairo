import { exec } from 'child_process';
import { useCallback, useEffect, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { getSelectedRemote, updateRepoConfig } from '../../lib/github/config.js';
import { GitRemote, getCurrentBranch, getRepoRoot, isGitRepo, listRemotes } from '../../lib/github/git.js';
import { PRDetails, PRListItem, getPRDetails, getRepoFromRemote, listPRsForBranch } from '../../lib/github/index.js';
import { Keybinding } from '../ui/KeybindingsBar.js';
import PRDetailsBox from './PRDetailsBox.js';
import PullRequestsBox from './PullRequestsBox.js';
import RemotesBox from './RemotesBox.js';

type FocusedBox = 'remotes' | 'prs' | 'details';

type Props = {
  isFocused: boolean;
  onKeybindingsChange?: (bindings: Keybinding[]) => void;
};

export default function GitHubView({ isFocused, onKeybindingsChange }: Props) {
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

  const handleCreatePR = useCallback(() => {
    // Open GitHub PR creation page in browser using gh CLI
    exec('gh pr create --web', () => {
      // Emit resize to refresh TUI after returning from browser
      process.stdout.emit('resize');
    });
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
