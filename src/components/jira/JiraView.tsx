import open from 'open';
import { useEffect, useRef } from 'react';
import LinkTicketModal from './LinkTicketModal.js';
import { TitledBox } from '@mishieck/ink-titled-box';
import { Box, Text, useInput } from 'ink';
import { useGitRepo } from '../../hooks/github/index.js';
import { useListNavigation, useModal } from '../../hooks/index.js';
import { JiraState, useJiraTickets } from '../../hooks/jira/index.js';
import { copyToClipboard } from '../../lib/clipboard.js';
import {
  clearJiraConfig,
  getExistingJiraConfigs,
  getJiraCredentials,
  getJiraSiteUrl,
  updateTicketStatus
} from '../../lib/jira/index.js';
import { logJiraStatusChanged } from '../../lib/logs/logger.js';
import ChangeStatusModal from './ChangeStatusModal.js';
import ConfigureJiraSiteModal from './ConfigureJiraSiteModal.js';
import TicketItem from './TicketItem.js';

type JiraModalType = 'configure' | 'link' | 'status';

type Props = {
  isFocused: boolean;
  onModalChange?: (isOpen: boolean) => void;
  onJiraStateChange?: (state: JiraState) => void;
  onLogUpdated?: () => void;
};

export default function JiraView({ isFocused, onModalChange, onJiraStateChange, onLogUpdated }: Props) {
  const repo = useGitRepo();
  const jira = useJiraTickets();
  const modal = useModal<JiraModalType>();
  const nav = useListNavigation(jira.tickets.length);

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

  // When focus is gained, refresh branch; when lost, close modal
  useEffect(() => {
    if (isFocused) {
      repo.refreshBranch();
    } else {
      modal.close();
    }
  }, [isFocused, repo.refreshBranch, modal.close]);

  // Notify parent when modal state changes
  useEffect(() => {
    onModalChange?.(modal.isOpen);
  }, [modal.isOpen, onModalChange]);

  // Notify parent of jira state changes
  useEffect(() => {
    onJiraStateChange?.(jira.jiraState);
  }, [jira.jiraState, onJiraStateChange]);

  // Handlers - simple enough to stay in component
  const handleConfigureSubmit = async (siteUrl: string, email: string, apiToken: string) => {
    if (!repo.repoPath) return;
    const success = await jira.configureJira(repo.repoPath, siteUrl, email, apiToken);
    if (success) modal.close();
  };

  const handleLinkSubmit = async (ticketInput: string) => {
    if (!repo.repoPath || !repo.currentBranch) return;
    const success = await jira.linkTicket(repo.repoPath, repo.currentBranch, ticketInput);
    if (success) modal.close();
  };

  const handleUnlinkTicket = () => {
    if (!repo.repoPath || !repo.currentBranch || jira.tickets.length === 0) return;
    const ticket = jira.tickets[nav.index];
    if (ticket) {
      jira.unlinkTicket(repo.repoPath, repo.currentBranch, ticket.key);
      jira.refreshTickets(repo.repoPath, repo.currentBranch);
      nav.prev();
    }
  };

  const handleOpenInBrowser = () => {
    if (!repo.repoPath || jira.tickets.length === 0) return;
    const ticket = jira.tickets[nav.index];
    const siteUrl = getJiraSiteUrl(repo.repoPath);
    if (ticket && siteUrl) {
      open(`${siteUrl}/browse/${ticket.key}`).catch(() => {});
    }
  };

  const handleCopyLink = () => {
    if (!repo.repoPath || jira.tickets.length === 0) return;
    const ticket = jira.tickets[nav.index];
    const siteUrl = getJiraSiteUrl(repo.repoPath);
    if (ticket && siteUrl) {
      copyToClipboard(`${siteUrl}/browse/${ticket.key}`);
    }
  };

  const handleStatusComplete = (newStatus: string) => {
    if (!repo.repoPath || !repo.currentBranch) return;
    const ticket = jira.tickets[nav.index];
    if (!ticket) return;

    updateTicketStatus(repo.repoPath, repo.currentBranch, ticket.key, newStatus);
    logJiraStatusChanged(ticket.key, ticket.summary, ticket.status, newStatus);
    onLogUpdated?.();
    modal.close();
    jira.refreshTickets(repo.repoPath, repo.currentBranch);
  };

  const handleRemoveConfig = () => {
    if (!repo.repoPath || !repo.currentBranch) return;
    clearJiraConfig(repo.repoPath);
    jira.initializeJiraState(repo.repoPath, repo.currentBranch, repo.currentRepoSlug);
  };

  // Keyboard navigation
  useInput(
    (input, key) => {
      if (input === 'c' && jira.jiraState === 'not_configured') {
        modal.open('configure');
        return;
      }

      if (input === 'l' && jira.jiraState !== 'not_configured') {
        modal.open('link');
        return;
      }

      if (input === 'r' && jira.jiraState !== 'not_configured') {
        handleRemoveConfig();
        return;
      }

      if (jira.jiraState === 'has_tickets') {
        if (key.upArrow || input === 'k') nav.prev();
        if (key.downArrow || input === 'j') nav.next();
        if (input === 's') modal.open('status');
        if (input === 'd') handleUnlinkTicket();
        if (input === 'o') handleOpenInBrowser();
        if (input === 'y') handleCopyLink();
      }
    },
    { isActive: isFocused && !modal.isOpen }
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
    const existingConfigs = getExistingJiraConfigs(repo.repoPath ?? undefined);

    return (
      <Box flexDirection="column" flexShrink={0}>
        <ConfigureJiraSiteModal
          initialSiteUrl={siteUrl ?? undefined}
          initialEmail={creds.email ?? undefined}
          existingConfigs={existingConfigs}
          onSubmit={handleConfigureSubmit}
          onCancel={() => {
            modal.close();
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
            modal.close();
            jira.clearError('link');
          }}
          loading={jira.loading.link}
          error={jira.errors.link}
        />
      </Box>
    );
  }

  if (modal.type === 'status' && repo.repoPath && repo.currentBranch && jira.tickets[nav.index]) {
    const ticket = jira.tickets[nav.index];
    return (
      <Box flexDirection="column" flexShrink={0}>
        <ChangeStatusModal
          repoPath={repo.repoPath}
          ticketKey={ticket.key}
          currentStatus={ticket.status}
          onComplete={handleStatusComplete}
          onCancel={modal.close}
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
              isHighlighted={idx === nav.index}
            />
          ))}
      </Box>
    </TitledBox>
  );
}
