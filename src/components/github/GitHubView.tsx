import { useCallback, useEffect, useState } from 'react';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { getSelectedRemote, updateRepoConfig } from '../../lib/github/config.js';
import { GitRemote, getCurrentBranch, getRepoRoot, isGitRepo, listRemotes } from '../../lib/github/git.js';
import { PRDetails, PRListItem, createPR, getPRDetails, getPRTemplate, getRepoFromRemote, listPRsForBranch } from '../../lib/github/index.js';
import { Keybinding } from '../ui/KeybindingsBar.js';
import CreatePRModal from './CreatePRModal.js';
import PRDetailsBox from './PRDetailsBox.js';
import PullRequestsBox from './PullRequestsBox.js';
import RemotesBox from './RemotesBox.js';

type FocusedBox = 'remotes' | 'prs' | 'details';

type Props = {
  isFocused: boolean;
  onModalChange?: (isOpen: boolean) => void;
  onKeybindingsChange?: (bindings: Keybinding[]) => void;
};

export default function GitHubView({ isFocused, onModalChange, onKeybindingsChange }: Props) {
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
    details: false,
    createPR: false
  });
  const [errors, setErrors] = useState<{
    remotes?: string;
    prs?: string;
    details?: string;
    createPR?: string;
  }>({});

  const [showCreatePR, setShowCreatePR] = useState(false);
  const [prTemplate, setPrTemplate] = useState<string | null>(null);

  const [focusedBox, setFocusedBox] = useState<FocusedBox>('remotes');

  // Close modal when focus is lost
  useEffect(() => {
    if (!isFocused) {
      setShowCreatePR(false);
      setErrors((prev) => ({ ...prev, createPR: undefined }));
    }
  }, [isFocused]);

  // Notify parent when modal state changes
  useEffect(() => {
    onModalChange?.(showCreatePR);
  }, [showCreatePR, onModalChange]);

  // Update keybindings based on focused box
  useEffect(() => {
    if (!isFocused || showCreatePR) {
      onKeybindingsChange?.([]);
      return;
    }

    const bindings: Keybinding[] = [];

    if (focusedBox === 'remotes') {
      bindings.push({ key: 'Enter', label: 'Select Remote' });
    } else if (focusedBox === 'prs') {
      bindings.push({ key: 'n', label: 'New PR', color: 'green' });
      bindings.push({ key: 'o', label: 'Open', color: 'green' });
      bindings.push({ key: 'y', label: 'Copy Link' });
    } else if (focusedBox === 'details') {
      bindings.push({ key: 'o', label: 'Open', color: 'green' });
    }

    onKeybindingsChange?.(bindings);
  }, [isFocused, focusedBox, showCreatePR, onKeybindingsChange]);

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
      const template = getPRTemplate(rootResult.data);
      setPrTemplate(template);
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

  useEffect(() => {
    if (!selectedRemote || !currentBranch) return;

    const remote = remotes.find((r) => r.name === selectedRemote);
    if (!remote) return;

    const repo = getRepoFromRemote(remote.url);
    if (!repo) return;

    setCurrentRepoSlug(repo);
    setLoading((prev) => ({ ...prev, prs: true }));
    setPrs([]);
    setSelectedPR(null);

    const fetchPRs = async () => {
      try {
        const result = await listPRsForBranch(currentBranch, repo);
        if (result.success) {
          setPrs(result.data);
          // Auto-select first PR
          if (result.data.length > 0) {
            setSelectedPR(result.data[0]);
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
    };

    fetchPRs();
  }, [selectedRemote, currentBranch, remotes]);

  useEffect(() => {
    if (!selectedPR || !currentRepoSlug) {
      setPrDetails(null);
      return;
    }

    setLoading((prev) => ({ ...prev, details: true }));

    const fetchDetails = async () => {
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
    };

    fetchDetails();
  }, [selectedPR, currentRepoSlug]);

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
    setShowCreatePR(true);
    setErrors((prev) => ({ ...prev, createPR: undefined }));
  }, []);

  const handleCreatePRSubmit = useCallback(
    async (title: string, body: string) => {
      if (!currentRepoSlug) return;

      setLoading((prev) => ({ ...prev, createPR: true }));
      setErrors((prev) => ({ ...prev, createPR: undefined }));

      try {
        const result = await createPR(currentRepoSlug, title, body);
        if (result.success) {
          setShowCreatePR(false);
          // Refresh PRs list
          if (currentBranch) {
            const prsResult = await listPRsForBranch(currentBranch, currentRepoSlug);
            if (prsResult.success) {
              setPrs(prsResult.data);
              // Select the newly created PR
              const newPR = prsResult.data.find((p) => p.number === result.data.number);
              if (newPR) {
                setSelectedPR(newPR);
              }
            }
          }
        } else {
          setErrors((prev) => ({ ...prev, createPR: result.error }));
        }
      } catch (err) {
        setErrors((prev) => ({ ...prev, createPR: String(err) }));
      } finally {
        setLoading((prev) => ({ ...prev, createPR: false }));
      }
    },
    [currentRepoSlug, currentBranch]
  );

  const handleCreatePRCancel = useCallback(() => {
    setShowCreatePR(false);
    setErrors((prev) => ({ ...prev, createPR: undefined }));
  }, []);

  useInput(
    (input) => {
      if (showCreatePR) return;
      if (input === '1') setFocusedBox('remotes');
      if (input === '2') setFocusedBox('prs');
      if (input === '3') setFocusedBox('details');
    },
    { isActive: isFocused && !showCreatePR }
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
        isFocused={isFocused && !showCreatePR && focusedBox === 'remotes'}
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
        isFocused={isFocused && !showCreatePR && focusedBox === 'prs'}
      />
      {showCreatePR && (
        <CreatePRModal
          template={prTemplate}
          onSubmit={handleCreatePRSubmit}
          onCancel={handleCreatePRCancel}
          loading={loading.createPR}
          error={errors.createPR}
        />
      )}
      <PRDetailsBox
        pr={prDetails}
        loading={loading.details}
        error={errors.details}
        isFocused={isFocused && !showCreatePR && focusedBox === 'details'}
      />
    </Box>
  );
}
