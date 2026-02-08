import { useRef, useEffect, useState, useCallback } from 'react';
import { listPRsForBranch, PRListItem } from '../../lib/github';

type PollingOptions = {
  branch: string;
  repoSlug: string;
  existingPRNumbers: number[];
  onNewPR: (pr: PRListItem) => void;
  onPRsUpdated: (prs: PRListItem[]) => void;
  maxAttempts?: number; // default 24
  pollInterval?: number; // default 5000
};

export function usePRPolling() {
  const prNumbersBeforeCreate = useRef<Set<number>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(
    (options: PollingOptions) => {
      const {
        branch,
        repoSlug,
        existingPRNumbers,
        onNewPR,
        onPRsUpdated,
        maxAttempts = 24,
        pollInterval = 5000,
      } = options;

      // Clear any existing polling before starting new one
      stopPolling();

      // Store current PR numbers before polling
      prNumbersBeforeCreate.current = new Set(existingPRNumbers);

      let attempts = 0;
      setIsPolling(true);

      pollingIntervalRef.current = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          stopPolling();
          return;
        }

        const result = await listPRsForBranch(branch, repoSlug);
        if (result.success) {
          onPRsUpdated(result.data);

          // Find newly created PR
          const newPR = result.data.find(
            (pr) => !prNumbersBeforeCreate.current.has(pr.number)
          );
          if (newPR) {
            // Stop polling - we found the new PR
            stopPolling();
            onNewPR(newPR);
          }
        }
      }, pollInterval);
    },
    [stopPolling]
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    startPolling,
    stopPolling,
    isPolling,
  };
}
