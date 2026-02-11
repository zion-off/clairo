import { useCallback, useState } from 'react';
import { duckEvents } from '../../lib/duckEvents';
import { PRDetails, PRListItem, getPRDetails, listPRsForBranch } from '../../lib/github/index';
import { usePRPolling } from './usePRPolling';

export function usePullRequests() {
  const [prs, setPrs] = useState<PRListItem[]>([]);
  const [selectedPR, setSelectedPR] = useState<PRListItem | null>(null);
  const [prDetails, setPrDetails] = useState<PRDetails | null>(null);
  const polling = usePRPolling();

  const [loading, setLoading] = useState({
    prs: false,
    details: false
  });
  const [errors, setErrors] = useState<{
    prs?: string;
    details?: string;
  }>({});

  const refreshPRs = useCallback(async (branch: string, repoSlug: string): Promise<PRListItem | null> => {
    setLoading((prev) => ({ ...prev, prs: true }));
    setPrs([]);
    setSelectedPR(null);
    setPrDetails(null);

    try {
      const result = await listPRsForBranch(branch, repoSlug);
      if (result.success) {
        setPrs(result.data);
        setErrors((prev) => ({ ...prev, prs: undefined }));
        // Return first PR so caller can fetch details
        return result.data[0] ?? null;
      } else {
        setErrors((prev) => ({ ...prev, prs: result.error }));
        return null;
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, prs: String(err) }));
      duckEvents.emit('error');
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, prs: false }));
    }
  }, []);

  const refreshDetails = useCallback(async (pr: PRListItem, repoSlug: string): Promise<void> => {
    setLoading((prev) => ({ ...prev, details: true }));

    try {
      const result = await getPRDetails(pr.number, repoSlug);
      if (result.success) {
        setPrDetails(result.data);
        setErrors((prev) => ({ ...prev, details: undefined }));

        const payload = { prNumber: result.data.number, prTitle: result.data.title };
        if (result.data.state === 'MERGED') {
          duckEvents.emit('pr:merged', payload);
        } else if (result.data.reviewDecision === 'APPROVED') {
          duckEvents.emit('pr:approved', payload);
        } else if (result.data.reviewDecision === 'CHANGES_REQUESTED') {
          duckEvents.emit('pr:changes-requested', payload);
        } else if (result.data.reviews.length > 0) {
          duckEvents.emit('pr:reviewed', payload);
        }
      } else {
        setErrors((prev) => ({ ...prev, details: result.error }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, details: String(err) }));
      duckEvents.emit('error');
    } finally {
      setLoading((prev) => ({ ...prev, details: false }));
    }
  }, []);

  // Fetch PRs and auto-select first with details
  const fetchPRsAndDetails = useCallback(
    async (branch: string, repoSlug: string): Promise<void> => {
      const firstPR = await refreshPRs(branch, repoSlug);
      if (firstPR) {
        setSelectedPR(firstPR);
        refreshDetails(firstPR, repoSlug);
      }
    },
    [refreshPRs, refreshDetails]
  );

  const selectPR = useCallback(
    (pr: PRListItem, repoSlug: string | null): void => {
      setSelectedPR(pr);
      if (repoSlug) {
        refreshDetails(pr, repoSlug);
      }
    },
    [refreshDetails]
  );

  // Helper to set error messages from outside the hook
  const setError = useCallback((key: 'prs' | 'details', message: string | undefined) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }, []);

  const pollForNewPR = useCallback(
    (options: { branch: string; repoSlug: string; onNewPR?: (newPR: PRListItem) => void }) => {
      const existingPRNumbers = prs.map((pr) => pr.number);

      polling.startPolling({
        branch: options.branch,
        repoSlug: options.repoSlug,
        existingPRNumbers,
        onPRsUpdated: (updatedPrs) => {
          setPrs(updatedPrs);
        },
        onNewPR: (newPR) => {
          setSelectedPR(newPR);
          refreshDetails(newPR, options.repoSlug);
          options.onNewPR?.(newPR);
        }
      });
    },
    [prs, polling.startPolling, refreshDetails]
  );

  return {
    prs,
    selectedPR,
    prDetails,
    refreshPRs,
    refreshDetails,
    fetchPRsAndDetails,
    selectPR,
    loading,
    errors,
    setError,
    pollForNewPR,
    stopPolling: polling.stopPolling,
    isPolling: polling.isPolling
  };
}
