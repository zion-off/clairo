import { useCallback, useEffect, useMemo, useState } from 'react';
import { duckEvents } from '../../lib/duckEvents.js';
import { getSelectedRemote, updateRepoConfig } from '../../lib/github/config.js';
import { GitRemote, getCurrentBranch, getRepoRoot, isGitRepo, listRemotes } from '../../lib/github/git.js';
import { getRepoFromRemote } from '../../lib/github/index.js';
import { useTerminalFocus } from '../useTerminalFocus.js';

export function useGitRepo() {
  const [isRepo, setIsRepo] = useState<boolean | null>(null);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const { focusCount } = useTerminalFocus();

  // Derive currentRepoSlug from selectedRemote and remotes
  const currentRepoSlug = useMemo(() => {
    if (!selectedRemote) return null;
    const remote = remotes.find((r) => r.name === selectedRemote);
    if (!remote) return null;
    return getRepoFromRemote(remote.url);
  }, [selectedRemote, remotes]);

  // One-time initialization on mount
  useEffect(() => {
    const gitRepoCheck = isGitRepo();
    setIsRepo(gitRepoCheck);

    if (!gitRepoCheck) {
      setLoading(false);
      setError('Not a git repository');
      duckEvents.emit('error');
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
    if (!remotesResult.success) {
      setError(remotesResult.error);
      duckEvents.emit('error');
      setLoading(false);
      return;
    }

    setRemotes(remotesResult.data);
    const remoteNames = remotesResult.data.map((r) => r.name);
    const defaultRemote = getSelectedRemote(rootResult.success ? rootResult.data : '', remoteNames);
    setSelectedRemote(defaultRemote);
    setLoading(false);
  }, []);

  // Refresh branch when terminal window gains focus
  useEffect(() => {
    if (!isRepo || focusCount === 0) return;

    const result = getCurrentBranch();
    if (result.success && result.data !== currentBranch) {
      setCurrentBranch(result.data);
    }
  }, [isRepo, focusCount]);

  const selectRemote = useCallback(
    (remoteName: string) => {
      setSelectedRemote(remoteName);
      if (repoPath) {
        updateRepoConfig(repoPath, { selectedRemote: remoteName });
      }
    },
    [repoPath]
  );

  // Re-check current branch (for detecting external branch switches)
  // Returns the new branch so callers can use it immediately
  const refreshBranch = useCallback((): string | null => {
    const branchResult = getCurrentBranch();
    if (branchResult.success) {
      setCurrentBranch(branchResult.data);
      return branchResult.data;
    }
    return null;
  }, []);

  return {
    isRepo,
    repoPath,
    remotes,
    currentBranch,
    selectedRemote,
    currentRepoSlug,
    selectRemote,
    refreshBranch,
    loading,
    error
  };
}
