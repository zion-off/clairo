import { useCallback, useEffect, useRef, useState } from 'react';
import open from 'open';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { copyToClipboard } from '../../lib/clipboard.js';
import { getJiraCredentials, getJiraSiteUrl, updateTicketStatus } from '../../lib/jira/index.js';
import { logJiraStatusChanged } from '../../lib/logs/logger.js';
import { useGitRepo } from '../../hooks/github/index.js';
import { useJiraTickets } from '../../hooks/jira/index.js';
import { JIRA_KEYBINDINGS } from '../../constants/jira.js';
import { Keybinding } from '../ui/KeybindingsBar.js';
import ChangeStatusModal from './ChangeStatusModal.js';
import ConfigureJiraSiteModal from './ConfigureJiraSiteModal.js';
import LinkTicketModal from './LinkTicketModal.js';
import TicketItem from './TicketItem.js';

type ModalState =
  | { type: 'none' }
  | { type: 'configure' }
  | { type: 'link' }
  | { type: 'status' };

type Props = {
  isFocused: boolean;
  onModalChange?: (isOpen: boolean) => void;
  onKeybindingsChange?: (bindings: Keybinding[]) => void;
  onLogUpdated?: () => void;
};

export default function JiraView({ isFocused, onModalChange, onKeybindingsChange, onLogUpdated }: Props) {
  const repo = useGitRepo();
  const jira = useJiraTickets();

  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Track last initialized context to prevent re-initialization
  const lastInitRef = useRef<{ branch: string } | null>(null);

  // Initialize Jira state when repo data is ready or branch changes
  useEffect(() => {
    if (repo.loading || !repo.repoPath || !repo.currentBranch) return;

    const current = { branch: repo.currentBranch };
    const last = lastInitRef.current;

    if (last && last.branch === current.branch) return;

    lastInitRef.current = current;
    jira.initializeJiraState(repo.repoPath, repo.currentBranch, repo.currentRepoSlug);
  }, [repo.loading, repo.repoPath, repo.currentBranch, repo.currentRepoSlug, jira.initializeJiraState]);

  // When focus is gained, refresh branch to detect external changes
  useEffect(() => {
    if (isFocused) {
      repo.refreshBranch();
    } else {
      setModal({ type: 'none' });
    }
  }, [isFocused, repo.refreshBranch]);

  // Notify parent when modal state changes
  useEffect(() => {
    onModalChange?.(modal.type !== 'none');
  }, [modal.type, onModalChange]);

  // Update keybindings based on state
  useEffect(() => {
    if (!isFocused || modal.type !== 'none') {
      onKeybindingsChange?.([]);
      return;
    }
    onKeybindingsChange?.(JIRA_KEYBINDINGS[jira.jiraState]);
  }, [isFocused, jira.jiraState, modal.type, onKeybindingsChange]);

  // Use ref pattern for callbacks with many dependencies
  const contextRef = useRef({ repo, jira, highlightedIndex, onLogUpdated });
  contextRef.current = { repo, jira, highlightedIndex, onLogUpdated };

  const handleConfigureSubmit = useCallback(
    async (siteUrl: string, email: string, apiToken: string) => {
      const { repo } = contextRef.current;
      if (!repo.repoPath) return;

      const success = await jira.configureJira(repo.repoPath, siteUrl, email, apiToken);
      if (success) {
        setModal({ type: 'none' });
      }
    },
    [jira.configureJira]
  );

  const handleLinkSubmit = useCallback(
    async (ticketInput: string) => {
      const { repo } = contextRef.current;
      if (!repo.repoPath || !repo.currentBranch) return;

      const success = await jira.linkTicket(repo.repoPath, repo.currentBranch, ticketInput);
      if (success) {
        setModal({ type: 'none' });
      }
    },
    [jira.linkTicket]
  );

  const handleUnlinkTicket = useCallback(() => {
    const { repo, jira: j, highlightedIndex: idx } = contextRef.current;
    if (!repo.repoPath || !repo.currentBranch || j.tickets.length === 0) return;

    const ticket = j.tickets[idx];
    if (ticket) {
      j.unlinkTicket(repo.repoPath, repo.currentBranch, ticket.key);
      j.refreshTickets(repo.repoPath, repo.currentBranch);
      setHighlightedIndex((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    const { repo, jira: j, highlightedIndex: idx } = contextRef.current;
    if (!repo.repoPath || j.tickets.length === 0) return;

    const ticket = j.tickets[idx];
    const siteUrl = getJiraSiteUrl(repo.repoPath);
    if (ticket && siteUrl) {
      const url = `${siteUrl}/browse/${ticket.key}`;
      open(url).catch(() => {});
    }
  }, []);

  const handleCopyLink = useCallback(() => {
    const { repo, jira: j, highlightedIndex: idx } = contextRef.current;
    if (!repo.repoPath) return;

    const ticket = j.tickets[idx];
    const siteUrl = getJiraSiteUrl(repo.repoPath);
    if (ticket && siteUrl) {
      const url = `${siteUrl}/browse/${ticket.key}`;
      copyToClipboard(url);
    }
  }, []);

  // Keyboard navigation
  useInput(
    (input, key) => {
      if (input === 'c' && jira.jiraState === 'not_configured') {
        setModal({ type: 'configure' });
        return;
      }

      if (input === 'l' && jira.jiraState !== 'not_configured') {
        setModal({ type: 'link' });
        return;
      }

      if (jira.jiraState === 'has_tickets') {
        if (key.upArrow || input === 'k') {
          setHighlightedIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.downArrow || input === 'j') {
          setHighlightedIndex((prev) => Math.min(jira.tickets.length - 1, prev + 1));
        }
        if (input === 's') {
          setModal({ type: 'status' });
        }
        if (input === 'd') {
          handleUnlinkTicket();
        }
        if (input === 'o') {
          handleOpenInBrowser();
        }
        if (input === 'y') {
          handleCopyLink();
        }
      }
    },
    { isActive: isFocused && modal.type === 'none' }
  );

  // Early return for non-git repo
  if (repo.isRepo === false) {
    return (
      <TitledBox borderStyle="round" titles={['Jira']} flexShrink={0}>
        <Text color="red">Not a git repository</Text>
      </TitledBox>
    );
  }

  // Modal rendering
  if (modal.type === 'configure') {
    const siteUrl = repo.repoPath ? getJiraSiteUrl(repo.repoPath) : undefined;
    const creds = repo.repoPath ? getJiraCredentials(repo.repoPath) : { email: null, apiToken: null };

    return (
      <Box flexDirection="column" flexShrink={0}>
        <ConfigureJiraSiteModal
          initialSiteUrl={siteUrl ?? undefined}
          initialEmail={creds.email ?? undefined}
          onSubmit={handleConfigureSubmit}
          onCancel={() => {
            setModal({ type: 'none' });
            jira.clearError('configure');
          }}
          loading={jira.loading.configure}
          error={jira.errors.configure}
        />
      </Box>
    );
  }

  if (modal.type === 'link') {
    return (
      <Box flexDirection="column" flexShrink={0}>
        <LinkTicketModal
          onSubmit={handleLinkSubmit}
          onCancel={() => {
            setModal({ type: 'none' });
            jira.clearError('link');
          }}
          loading={jira.loading.link}
          error={jira.errors.link}
        />
      </Box>
    );
  }

  if (modal.type === 'status' && repo.repoPath && repo.currentBranch && jira.tickets[highlightedIndex]) {
    const ticket = jira.tickets[highlightedIndex];
    return (
      <Box flexDirection="column" flexShrink={0}>
        <ChangeStatusModal
          repoPath={repo.repoPath}
          ticketKey={ticket.key}
          currentStatus={ticket.status}
          onComplete={(newStatus) => {
            const oldStatus = ticket.status;
            updateTicketStatus(repo.repoPath!, repo.currentBranch!, ticket.key, newStatus);
            logJiraStatusChanged(ticket.key, ticket.summary, oldStatus, newStatus);
            onLogUpdated?.();
            setModal({ type: 'none' });
            jira.refreshTickets(repo.repoPath!, repo.currentBranch!);
          }}
          onCancel={() => setModal({ type: 'none' })}
        />
      </Box>
    );
  }

  // Main view
  const title = '[4] Jira';
  const borderColor = isFocused ? 'yellow' : undefined;

  return (
    <TitledBox borderStyle="round" titles={[title]} borderColor={borderColor} flexShrink={0}>
      <Box flexDirection="column" paddingX={1}>
        {jira.jiraState === 'not_configured' && <Text dimColor>No Jira site configured</Text>}

        {jira.jiraState === 'no_tickets' && <Text dimColor>No tickets linked to this branch</Text>}

        {jira.jiraState === 'has_tickets' &&
          jira.tickets.map((ticket, idx) => (
            <TicketItem
              key={ticket.key}
              ticketKey={ticket.key}
              summary={ticket.summary}
              status={ticket.status}
              isHighlighted={idx === highlightedIndex}
            />
          ))}
      </Box>
    </TitledBox>
  );
}
