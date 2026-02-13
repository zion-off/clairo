import open from 'open';
import { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ScrollView } from 'ink-scroll-view';
import Spinner from 'ink-spinner';
import { useGitRepo } from '../../hooks/github/index';
import { useListNavigation } from '../../hooks/index';
import { copyToClipboard } from '../../lib/clipboard';
import { duckEvents } from '../../lib/duckEvents';
import {
  CHECK_COLORS,
  CHECK_ICONS,
  CheckStatus,
  PRDetails,
  PRListItem,
  getPRDetails,
  resolveCheckStatus,
  resolveReviewDisplay,
  timeAgo
} from '../../lib/github/index';
import { checkoutPR, listPRs } from '../../lib/github/pr-list';
import PRDetailsBox from '../github/PRDetailsBox';
import TitledBox from '../ui/TitledBox';

type PRState = 'open' | 'closed' | 'all';

const STATE_CYCLE: PRState[] = ['open', 'closed', 'all'];

function computeOverallCheck(checks: PRListItem['statusCheckRollup']): CheckStatus | null {
  if (!checks || checks.length === 0) return null;
  const statuses = checks.map(resolveCheckStatus);
  if (statuses.some((s) => s === 'failure')) return 'failure';
  if (statuses.some((s) => s === 'pending')) return 'pending';
  return 'success';
}

type Props = {
  isActive: boolean;
  onModalChange?: (isOpen: boolean) => void;
};

export default function AllPullRequestsView({ isActive, onModalChange }: Props) {
  const repo = useGitRepo();
  const [prs, setPrs] = useState<PRListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailPR, setDetailPR] = useState<PRListItem | null>(null);
  const [prDetails, setPrDetails] = useState<PRDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | undefined>(undefined);
  const [stateFilter, setStateFilter] = useState<PRState>('open');
  const [searchText, setSearchText] = useState('');
  const [inputText, setInputText] = useState('');
  const [limit, setLimit] = useState(30);
  const [isSearching, setIsSearching] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    onModalChange?.(isSearching || detailPR !== null);
  }, [isSearching, detailPR, onModalChange]);

  const doFetch = useCallback(
    async (state: PRState, search: string, fetchLimit = 30) => {
      if (!repo.currentRepoSlug) return;
      setLoading(true);
      setError(null);
      setPrs([]);

      const result = await listPRs(repo.currentRepoSlug, {
        state,
        search: search || undefined,
        limit: fetchLimit
      });
      if (result.success) {
        setPrs(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    },
    [repo.currentRepoSlug]
  );

  // Fetch on mount and when repo changes
  useEffect(() => {
    if (repo.currentRepoSlug) {
      setStateFilter('open');
      setSearchText('');
      setInputText('');
      doFetch('open', '');
    }
  }, [repo.currentRepoSlug]);

  const fetchDetails = useCallback(
    async (pr: PRListItem) => {
      if (!repo.currentRepoSlug) return;
      setDetailsLoading(true);
      setDetailsError(undefined);

      const result = await getPRDetails(pr.number, repo.currentRepoSlug);
      if (result.success) {
        setPrDetails(result.data);
        setDetailsError(undefined);
      } else {
        setDetailsError(result.error);
      }
      setDetailsLoading(false);
    },
    [repo.currentRepoSlug]
  );

  const handleSelect = useCallback(
    (index: number) => {
      const pr = prs[index];
      if (pr) {
        setDetailPR(pr);
        fetchDetails(pr);
      }
    },
    [prs, fetchDetails]
  );

  const { highlightedIndex, scrollRef } = useListNavigation({
    items: prs,
    selectedIndex: detailPR ? prs.findIndex((p) => p.number === detailPR.number) : -1,
    onSelect: handleSelect,
    isActive: isActive && !detailPR && !isSearching
  });

  const currentPR = prs[highlightedIndex] ?? null;

  const getPRUrl = (pr: PRListItem) => {
    if (!repo.currentRepoSlug) return null;
    return `https://github.com/${repo.currentRepoSlug}/pull/${pr.number}`;
  };

  const hasActiveFilters = stateFilter !== 'open' || searchText.length > 0;

  // List box input
  useInput(
    (input, key) => {
      if (isSearching) {
        if (key.escape) {
          setIsSearching(false);
          setInputText(searchText);
          return;
        }
        if (key.return) {
          setIsSearching(false);
          const newSearch = inputText.trim();
          if (newSearch !== searchText) {
            setSearchText(newSearch);
            setLimit(30);
            doFetch(stateFilter, newSearch);
            duckEvents.emit('pr:filtered');
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

      if (input === '/') {
        setIsSearching(true);
        setInputText(searchText);
        return;
      }
      if (input === 's') {
        const idx = STATE_CYCLE.indexOf(stateFilter);
        const newState = STATE_CYCLE[(idx + 1) % STATE_CYCLE.length]!;
        setStateFilter(newState);
        setLimit(30);
        doFetch(newState, searchText);
        duckEvents.emit('pr:filtered');
        return;
      }
      if (input === 'x') {
        setStateFilter('open');
        setSearchText('');
        setInputText('');
        setLimit(30);
        doFetch('open', '');
        return;
      }
      if (input === 'o' && currentPR) {
        const url = getPRUrl(currentPR);
        if (url) open(url).catch(() => {});
      }
      if (input === 'y' && currentPR) {
        const url = getPRUrl(currentPR);
        if (url) copyToClipboard(url);
      }
      if (input === 'l') {
        const newLimit = limit + 30;
        setLimit(newLimit);
        doFetch(stateFilter, searchText, newLimit);
        return;
      }
      if (input === 'r') {
        doFetch(stateFilter, searchText, limit);
      }
    },
    { isActive: isActive && !detailPR }
  );

  // Detail view input
  useInput(
    (input, key) => {
      if (key.escape) {
        setDetailPR(null);
        setCheckoutResult(null);
        return;
      }
      if (input === 'y' && detailPR) {
        const url = getPRUrl(detailPR);
        if (url) copyToClipboard(url);
      }
      if (input === 'c' && detailPR && !checkoutLoading && repo.currentRepoSlug) {
        setCheckoutLoading(true);
        setCheckoutResult(null);
        checkoutPR(detailPR.number, repo.currentRepoSlug).then((result) => {
          setCheckoutLoading(false);
          if (result.success) {
            setCheckoutResult({ success: true, message: `Checked out #${detailPR.number}` });
            duckEvents.emit('pr:checkout', { prNumber: detailPR.number, prTitle: detailPR.title });
            repo.refreshBranch();
          } else {
            setCheckoutResult({ success: false, message: result.error });
          }
        });
      }
    },
    { isActive: isActive && detailPR !== null }
  );

  // Build filter status line
  const filterParts: string[] = [];
  if (stateFilter !== 'open') filterParts.push(stateFilter);
  if (searchText) filterParts.push(`"${searchText}"`);

  const borderColor = isActive ? 'yellow' : undefined;
  const scrollRatio = isActive && prs.length > 1 ? highlightedIndex / (prs.length - 1) : null;

  const stateColor = (pr: PRListItem) => {
    if (pr.state === 'MERGED') return 'magenta';
    if (pr.state === 'CLOSED') return 'red';
    if (pr.isDraft) return 'gray';
    return 'green';
  };

  const stateIcon = (pr: PRListItem) => {
    if (pr.state === 'MERGED') return '\ue727';
    return '\ue726';
  };

  if (detailPR) {
    const hintFooter = checkoutLoading ? (
      <Box paddingX={1}>
        <Text color="yellow">
          <Spinner type="dots" /> Checking out...
        </Text>
      </Box>
    ) : checkoutResult ? (
      <Box paddingX={1}>
        <Text color={checkoutResult.success ? 'green' : 'red'}>{checkoutResult.message}</Text>
      </Box>
    ) : (
      <Box paddingX={1}>
        <Text dimColor>Esc back · j/k scroll · o open · y copy · c checkout</Text>
      </Box>
    );

    return (
      <PRDetailsBox
        pr={prDetails}
        loading={detailsLoading}
        error={detailsError}
        isActive={isActive}
        title="[5] Pull Requests"
        footer={hintFooter}
      />
    );
  }

  return (
    <TitledBox title="[5] Pull Requests" borderColor={borderColor} scrollRatio={scrollRatio}>
      <Box flexDirection="column" paddingX={1} flexGrow={1} flexBasis={0} overflow="hidden">
        {/* Filter bar */}
        {(isSearching || hasActiveFilters) && (
          <Box>
            <Text color="blue">Filter: </Text>
            {isSearching ? (
              <>
                <Text>{inputText}</Text>
                <Text backgroundColor="yellow"> </Text>
              </>
            ) : (
              <>
                <Text>{filterParts.join(' + ')}</Text>
                <Text dimColor> ({prs.length})</Text>
              </>
            )}
          </Box>
        )}

        {/* Content */}
        {loading && (
          <Text color="yellow">
            <Spinner type="dots" /> Loading PRs 1-{limit}...
          </Text>
        )}
        {error && <Text color="red">{error}</Text>}
        {!loading && !error && prs.length === 0 && (
          <Text dimColor>{hasActiveFilters ? 'No PRs match filter' : 'No open PRs'}</Text>
        )}
        {!loading && !error && prs.length > 0 && (
          <Box flexGrow={1} flexBasis={0} overflow="hidden">
            <ScrollView ref={scrollRef}>
              {prs.map((pr, idx) => {
                const isHighlighted = isActive && idx === highlightedIndex;
                const cursor = isHighlighted ? '>' : ' ';
                const review = resolveReviewDisplay(pr.reviewDecision);
                const overallCheck = computeOverallCheck(pr.statusCheckRollup);
                return (
                  <Box key={pr.number} flexDirection="column">
                    <Box>
                      <Text color={isHighlighted ? 'yellow' : undefined}>{cursor} </Text>
                      <Text color={stateColor(pr)}>{stateIcon(pr)} </Text>
                      <Text>{pr.title}</Text>
                    </Box>
                    <Box>
                      <Text> </Text>
                      <Text dimColor>
                        {' '}
                        #{pr.number} · {pr.author.login} · {timeAgo(pr.createdAt)}
                      </Text>
                      {pr.reviewDecision && <Text dimColor> · {review.text}</Text>}
                      {overallCheck && <Text color={CHECK_COLORS[overallCheck]}> {CHECK_ICONS[overallCheck]}</Text>}
                    </Box>
                  </Box>
                );
              })}
            </ScrollView>
          </Box>
        )}
      </Box>
    </TitledBox>
  );
}
