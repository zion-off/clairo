import { useCallback, useEffect, useState } from 'react';
import open from 'open';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { copyToClipboard } from '../../lib/clipboard.js';
import { getCurrentBranch, getRepoRoot, isGitRepo } from '../../lib/github/git.js';
import {
  addLinkedTicket,
  extractTicketKeyFromBranch,
  getIssue,
  getJiraCredentials,
  getJiraSiteUrl,
  getLinkedTickets,
  isJiraConfigured,
  JiraAuth,
  LinkedTicket,
  parseTicketKey,
  removeLinkedTicket,
  setJiraCredentials,
  setJiraSiteUrl,
  updateTicketStatus,
  validateCredentials,
} from '../../lib/jira/index.js';
import { Keybinding } from '../ui/KeybindingsBar.js';
import ChangeStatusModal from './ChangeStatusModal.js';
import ConfigureJiraSiteModal from './ConfigureJiraSiteModal.js';
import LinkTicketModal from './LinkTicketModal.js';
import TicketItem from './TicketItem.js';

type JiraState = 'not_configured' | 'no_tickets' | 'has_tickets';

type Props = {
  isFocused: boolean;
  onModalChange?: (isOpen: boolean) => void;
  onKeybindingsChange?: (bindings: Keybinding[]) => void;
};

export default function JiraView({ isFocused, onModalChange, onKeybindingsChange }: Props) {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [isRepo, setIsRepo] = useState<boolean | null>(null);

  const [jiraState, setJiraState] = useState<JiraState>('not_configured');
  const [tickets, setTickets] = useState<LinkedTicket[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [loading, setLoading] = useState({ configure: false, link: false });
  const [errors, setErrors] = useState<{ configure?: string; link?: string }>({});

  // Close modals when focus is lost
  useEffect(() => {
    if (!isFocused) {
      setShowConfigureModal(false);
      setShowLinkModal(false);
      setShowStatusModal(false);
      setErrors({});
    }
  }, [isFocused]);

  // Notify parent when modal state changes
  useEffect(() => {
    onModalChange?.(showConfigureModal || showLinkModal || showStatusModal);
  }, [showConfigureModal, showLinkModal, showStatusModal, onModalChange]);

  // Update keybindings based on state
  useEffect(() => {
    if (!isFocused || showConfigureModal || showLinkModal || showStatusModal) {
      onKeybindingsChange?.([]);
      return;
    }

    const bindings: Keybinding[] = [];

    if (jiraState === 'not_configured') {
      bindings.push({ key: 'c', label: 'Configure Jira' });
    } else if (jiraState === 'no_tickets') {
      bindings.push({ key: 'l', label: 'Link Ticket' });
    } else if (jiraState === 'has_tickets') {
      bindings.push({ key: 'l', label: 'Link' });
      bindings.push({ key: 's', label: 'Status' });
      bindings.push({ key: 'd', label: 'Unlink', color: 'red' });
      bindings.push({ key: 'o', label: 'Open', color: 'green' });
      bindings.push({ key: 'y', label: 'Copy Link' });
    }

    onKeybindingsChange?.(bindings);
  }, [isFocused, jiraState, showConfigureModal, showLinkModal, showStatusModal, onKeybindingsChange]);

  // Initialize repo info
  useEffect(() => {
    const gitRepoCheck = isGitRepo();
    setIsRepo(gitRepoCheck);

    if (!gitRepoCheck) return;

    const rootResult = getRepoRoot();
    if (rootResult.success) {
      setRepoPath(rootResult.data);
    }

    const branchResult = getCurrentBranch();
    if (branchResult.success) {
      setCurrentBranch(branchResult.data);
    }
  }, []);

  // Load Jira state when repo/branch changes
  useEffect(() => {
    if (!repoPath || !currentBranch) return;

    if (!isJiraConfigured(repoPath)) {
      setJiraState('not_configured');
      setTickets([]);
      return;
    }

    const linkedTickets = getLinkedTickets(repoPath, currentBranch);
    setTickets(linkedTickets);
    setJiraState(linkedTickets.length > 0 ? 'has_tickets' : 'no_tickets');
  }, [repoPath, currentBranch]);

  // Auto-detect and link ticket from branch name
  useEffect(() => {
    if (!repoPath || !currentBranch) return;
    if (jiraState !== 'no_tickets') return;

    const ticketKey = extractTicketKeyFromBranch(currentBranch);
    if (!ticketKey) return;

    // Check if already linked
    const existingTickets = getLinkedTickets(repoPath, currentBranch);
    if (existingTickets.some((t) => t.key === ticketKey)) return;

    const siteUrl = getJiraSiteUrl(repoPath);
    const creds = getJiraCredentials(repoPath);
    if (!siteUrl || !creds.email || !creds.apiToken) return;

    const auth: JiraAuth = { siteUrl, email: creds.email, apiToken: creds.apiToken };

    // Fetch and auto-link the ticket
    getIssue(auth, ticketKey).then((result) => {
      if (result.success) {
        const linkedTicket: LinkedTicket = {
          key: result.data.key,
          summary: result.data.fields.summary,
          status: result.data.fields.status.name,
          linkedAt: new Date().toISOString(),
        };
        addLinkedTicket(repoPath, currentBranch, linkedTicket);
        setTickets([linkedTicket]);
        setJiraState('has_tickets');
      }
    });
  }, [repoPath, currentBranch, jiraState]);

  const refreshTickets = useCallback(() => {
    if (!repoPath || !currentBranch) return;
    const linkedTickets = getLinkedTickets(repoPath, currentBranch);
    setTickets(linkedTickets);
    setJiraState(linkedTickets.length > 0 ? 'has_tickets' : 'no_tickets');
  }, [repoPath, currentBranch]);

  const handleConfigureSubmit = useCallback(
    async (siteUrl: string, email: string, apiToken: string) => {
      if (!repoPath) return;

      setLoading((prev) => ({ ...prev, configure: true }));
      setErrors((prev) => ({ ...prev, configure: undefined }));

      const auth: JiraAuth = { siteUrl, email, apiToken };
      const result = await validateCredentials(auth);

      if (!result.success) {
        setErrors((prev) => ({ ...prev, configure: result.error }));
        setLoading((prev) => ({ ...prev, configure: false }));
        return;
      }

      setJiraSiteUrl(repoPath, siteUrl);
      setJiraCredentials(repoPath, email, apiToken);
      setShowConfigureModal(false);
      setJiraState('no_tickets');
      setLoading((prev) => ({ ...prev, configure: false }));
    },
    [repoPath]
  );

  const handleLinkSubmit = useCallback(
    async (ticketInput: string) => {
      if (!repoPath || !currentBranch) return;

      setLoading((prev) => ({ ...prev, link: true }));
      setErrors((prev) => ({ ...prev, link: undefined }));

      const ticketKey = parseTicketKey(ticketInput);
      if (!ticketKey) {
        setErrors((prev) => ({ ...prev, link: 'Invalid ticket format. Use PROJ-123 or a Jira URL.' }));
        setLoading((prev) => ({ ...prev, link: false }));
        return;
      }

      const siteUrl = getJiraSiteUrl(repoPath);
      const creds = getJiraCredentials(repoPath);

      if (!siteUrl || !creds.email || !creds.apiToken) {
        setErrors((prev) => ({ ...prev, link: 'Jira not configured' }));
        setLoading((prev) => ({ ...prev, link: false }));
        return;
      }

      const auth: JiraAuth = { siteUrl, email: creds.email, apiToken: creds.apiToken };
      const result = await getIssue(auth, ticketKey);

      if (!result.success) {
        setErrors((prev) => ({ ...prev, link: result.error }));
        setLoading((prev) => ({ ...prev, link: false }));
        return;
      }

      const linkedTicket: LinkedTicket = {
        key: result.data.key,
        summary: result.data.fields.summary,
        status: result.data.fields.status.name,
        linkedAt: new Date().toISOString(),
      };

      addLinkedTicket(repoPath, currentBranch, linkedTicket);
      refreshTickets();
      setShowLinkModal(false);
      setLoading((prev) => ({ ...prev, link: false }));
    },
    [repoPath, currentBranch, refreshTickets]
  );

  const handleUnlinkTicket = useCallback(() => {
    if (!repoPath || !currentBranch || tickets.length === 0) return;
    const ticket = tickets[highlightedIndex];
    if (ticket) {
      removeLinkedTicket(repoPath, currentBranch, ticket.key);
      refreshTickets();
      setHighlightedIndex((prev) => Math.max(0, prev - 1));
    }
  }, [repoPath, currentBranch, tickets, highlightedIndex, refreshTickets]);

  const handleOpenInBrowser = useCallback(() => {
    if (!repoPath || tickets.length === 0) return;
    const ticket = tickets[highlightedIndex];
    const siteUrl = getJiraSiteUrl(repoPath);
    if (ticket && siteUrl) {
      const url = `${siteUrl}/browse/${ticket.key}`;
      open(url).catch(() => {});
    }
  }, [repoPath, tickets, highlightedIndex]);

  // Keyboard navigation
  useInput(
    (input, key) => {
      if (showConfigureModal || showLinkModal || showStatusModal) return;

      if (input === 'c' && jiraState === 'not_configured') {
        setShowConfigureModal(true);
        return;
      }

      if (input === 'l' && jiraState !== 'not_configured') {
        setShowLinkModal(true);
        return;
      }

      if (jiraState === 'has_tickets') {
        if (key.upArrow || input === 'k') {
          setHighlightedIndex((prev) => Math.max(0, prev - 1));
        }
        if (key.downArrow || input === 'j') {
          setHighlightedIndex((prev) => Math.min(tickets.length - 1, prev + 1));
        }
        if (input === 's') {
          setShowStatusModal(true);
        }
        if (input === 'd') {
          handleUnlinkTicket();
        }
        if (input === 'o') {
          handleOpenInBrowser();
        }
        if (input === 'y' && repoPath) {
          const ticket = tickets[highlightedIndex];
          const siteUrl = getJiraSiteUrl(repoPath);
          if (ticket && siteUrl) {
            const url = `${siteUrl}/browse/${ticket.key}`;
            copyToClipboard(url);
          }
        }
      }
    },
    { isActive: isFocused && !showConfigureModal && !showLinkModal && !showStatusModal }
  );

  if (isRepo === false) {
    return (
      <TitledBox borderStyle="round" titles={['Jira']} flexShrink={0}>
        <Text color="red">Not a git repository</Text>
      </TitledBox>
    );
  }

  if (showConfigureModal) {
    const siteUrl = repoPath ? getJiraSiteUrl(repoPath) : undefined;
    const creds = repoPath ? getJiraCredentials(repoPath) : { email: null, apiToken: null };

    return (
      <Box flexDirection="column" flexShrink={0}>
        <ConfigureJiraSiteModal
          initialSiteUrl={siteUrl ?? undefined}
          initialEmail={creds.email ?? undefined}
          onSubmit={handleConfigureSubmit}
          onCancel={() => {
            setShowConfigureModal(false);
            setErrors((prev) => ({ ...prev, configure: undefined }));
          }}
          loading={loading.configure}
          error={errors.configure}
        />
      </Box>
    );
  }

  if (showLinkModal) {
    return (
      <Box flexDirection="column" flexShrink={0}>
        <LinkTicketModal
          onSubmit={handleLinkSubmit}
          onCancel={() => {
            setShowLinkModal(false);
            setErrors((prev) => ({ ...prev, link: undefined }));
          }}
          loading={loading.link}
          error={errors.link}
        />
      </Box>
    );
  }

  if (showStatusModal && repoPath && currentBranch && tickets[highlightedIndex]) {
    const ticket = tickets[highlightedIndex];
    return (
      <Box flexDirection="column" flexShrink={0}>
        <ChangeStatusModal
          repoPath={repoPath}
          ticketKey={ticket.key}
          currentStatus={ticket.status}
          onComplete={(newStatus) => {
            updateTicketStatus(repoPath, currentBranch, ticket.key, newStatus);
            setShowStatusModal(false);
            refreshTickets();
          }}
          onCancel={() => setShowStatusModal(false)}
        />
      </Box>
    );
  }

  const title = '[4] Jira';
  const borderColor = isFocused ? 'yellow' : undefined;

  return (
    <TitledBox borderStyle="round" titles={[title]} borderColor={borderColor} flexShrink={0}>
      <Box flexDirection="column" paddingX={1}>
        {jiraState === 'not_configured' && (
          <Text dimColor>No Jira site configured</Text>
        )}

        {jiraState === 'no_tickets' && (
          <Text dimColor>No tickets linked to this branch</Text>
        )}

        {jiraState === 'has_tickets' &&
          tickets.map((ticket, idx) => (
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
