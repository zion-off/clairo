import { useCallback, useState } from 'react';
import { duckEvents } from '../../lib/duckEvents.js';
import { listPRsForBranch } from '../../lib/github/index.js';
import {
  JiraAuth,
  LinkedTicket,
  addLinkedTicket,
  extractTicketKey,
  getIssue,
  getJiraCredentials,
  getJiraSiteUrl,
  getLinkedTickets,
  isJiraConfigured,
  parseTicketKey,
  removeLinkedTicket,
  setJiraCredentials,
  setJiraSiteUrl,
  validateCredentials
} from '../../lib/jira/index.js';

export type JiraState = 'not_configured' | 'no_tickets' | 'has_tickets';

export function useJiraTickets() {
  const [jiraState, setJiraState] = useState<JiraState>('not_configured');
  const [tickets, setTickets] = useState<LinkedTicket[]>([]);
  const [loading, setLoading] = useState({ configure: false, link: false });
  const [errors, setErrors] = useState<{ configure?: string; link?: string }>({});

  // Initialize Jira state AND auto-detect ticket in one function
  // This eliminates the effect chain by doing both operations in sequence
  const initializeJiraState = useCallback(async (repoPath: string, currentBranch: string, repoSlug?: string | null) => {
    if (!isJiraConfigured(repoPath)) {
      setJiraState('not_configured');
      setTickets([]);
      return;
    }

    const linkedTickets = getLinkedTickets(repoPath, currentBranch);

    if (linkedTickets.length > 0) {
      setTickets(linkedTickets);
      setJiraState('has_tickets');
      return;
    }

    // No tickets - attempt auto-detection from branch name
    let ticketKey = extractTicketKey(currentBranch);

    // If no ticket in branch name and repoSlug provided, try PR title
    if (!ticketKey && repoSlug) {
      const prResult = await listPRsForBranch(currentBranch, repoSlug);
      if (prResult.success && prResult.data.length > 0) {
        ticketKey = extractTicketKey(prResult.data[0].title);
      }
    }

    if (!ticketKey) {
      setTickets([]);
      setJiraState('no_tickets');
      return;
    }

    const siteUrl = getJiraSiteUrl(repoPath);
    const creds = getJiraCredentials(repoPath);
    if (!siteUrl || !creds.email || !creds.apiToken) {
      setTickets([]);
      setJiraState('no_tickets');
      return;
    }

    const auth: JiraAuth = { siteUrl, email: creds.email, apiToken: creds.apiToken };

    // Fetch and auto-link the ticket
    const result = await getIssue(auth, ticketKey);
    if (result.success) {
      const linkedTicket: LinkedTicket = {
        key: result.data.key,
        summary: result.data.fields.summary,
        status: result.data.fields.status.name,
        linkedAt: new Date().toISOString()
      };
      addLinkedTicket(repoPath, currentBranch, linkedTicket);
      setTickets([linkedTicket]);
      setJiraState('has_tickets');
    } else {
      setTickets([]);
      setJiraState('no_tickets');
    }
  }, []);

  const refreshTickets = useCallback((repoPath: string, currentBranch: string) => {
    const linkedTickets = getLinkedTickets(repoPath, currentBranch);
    setTickets(linkedTickets);
    setJiraState(linkedTickets.length > 0 ? 'has_tickets' : 'no_tickets');
  }, []);

  const configureJira = useCallback(
    async (repoPath: string, siteUrl: string, email: string, apiToken: string): Promise<boolean> => {
      setLoading((prev) => ({ ...prev, configure: true }));
      setErrors((prev) => ({ ...prev, configure: undefined }));

      const auth: JiraAuth = { siteUrl, email, apiToken };
      const result = await validateCredentials(auth);

      if (!result.success) {
        setErrors((prev) => ({ ...prev, configure: result.error }));
        duckEvents.emit('error');
        setLoading((prev) => ({ ...prev, configure: false }));
        return false;
      }

      setJiraSiteUrl(repoPath, siteUrl);
      setJiraCredentials(repoPath, email, apiToken);
      setJiraState('no_tickets');
      duckEvents.emit('jira:configured');
      setLoading((prev) => ({ ...prev, configure: false }));
      return true;
    },
    []
  );

  const linkTicket = useCallback(
    async (repoPath: string, currentBranch: string, ticketInput: string): Promise<boolean> => {
      setLoading((prev) => ({ ...prev, link: true }));
      setErrors((prev) => ({ ...prev, link: undefined }));

      const ticketKey = parseTicketKey(ticketInput);
      if (!ticketKey) {
        setErrors((prev) => ({ ...prev, link: 'Invalid ticket format. Use PROJ-123 or a Jira URL.' }));
        duckEvents.emit('error');
        setLoading((prev) => ({ ...prev, link: false }));
        return false;
      }

      const siteUrl = getJiraSiteUrl(repoPath);
      const creds = getJiraCredentials(repoPath);

      if (!siteUrl || !creds.email || !creds.apiToken) {
        setErrors((prev) => ({ ...prev, link: 'Jira not configured' }));
        duckEvents.emit('error');
        setLoading((prev) => ({ ...prev, link: false }));
        return false;
      }

      const auth: JiraAuth = { siteUrl, email: creds.email, apiToken: creds.apiToken };
      const result = await getIssue(auth, ticketKey);

      if (!result.success) {
        setErrors((prev) => ({ ...prev, link: result.error }));
        duckEvents.emit('error');
        setLoading((prev) => ({ ...prev, link: false }));
        return false;
      }

      const linkedTicket: LinkedTicket = {
        key: result.data.key,
        summary: result.data.fields.summary,
        status: result.data.fields.status.name,
        linkedAt: new Date().toISOString()
      };

      addLinkedTicket(repoPath, currentBranch, linkedTicket);
      const newTickets = getLinkedTickets(repoPath, currentBranch);
      setTickets(newTickets);
      setJiraState('has_tickets');
      duckEvents.emit('jira:linked');
      setLoading((prev) => ({ ...prev, link: false }));
      return true;
    },
    []
  );

  const unlinkTicket = useCallback((repoPath: string, currentBranch: string, ticketKey: string) => {
    removeLinkedTicket(repoPath, currentBranch, ticketKey);
  }, []);

  const clearError = useCallback((key: 'configure' | 'link') => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  return {
    jiraState,
    tickets,
    loading,
    errors,
    initializeJiraState,
    refreshTickets,
    configureJira,
    linkTicket,
    unlinkTicket,
    clearError
  };
}
