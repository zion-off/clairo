import { LinkedTicket, loadConfig } from '../config/index.js';
import { getRepoConfig, updateRepoConfig } from '../github/config.js';

export type ExistingJiraConfig = {
  repoPath: string;
  siteUrl: string;
  email: string;
  apiToken: string;
};

/**
 * Get all existing Jira configurations from other repositories
 */
export function getExistingJiraConfigs(excludeRepoPath?: string): ExistingJiraConfig[] {
  const config = loadConfig();
  const repos = config.repositories ?? {};

  const configs: ExistingJiraConfig[] = [];
  const seen = new Set<string>();

  for (const [repoPath, repoConfig] of Object.entries(repos)) {
    if (repoPath === excludeRepoPath) continue;
    if (!repoConfig.jiraSiteUrl || !repoConfig.jiraEmail || !repoConfig.jiraApiToken) continue;

    // Deduplicate by site URL + email combo
    const key = `${repoConfig.jiraSiteUrl}|${repoConfig.jiraEmail}`;
    if (seen.has(key)) continue;
    seen.add(key);

    configs.push({
      repoPath,
      siteUrl: repoConfig.jiraSiteUrl,
      email: repoConfig.jiraEmail,
      apiToken: repoConfig.jiraApiToken
    });
  }

  return configs;
}

/**
 * Check if Jira is configured for a repository
 */
export function isJiraConfigured(repoPath: string): boolean {
  const config = getRepoConfig(repoPath);
  return !!(config.jiraSiteUrl && config.jiraEmail && config.jiraApiToken);
}

/**
 * Get the Jira site URL for a repository
 */
export function getJiraSiteUrl(repoPath: string): string | null {
  const config = getRepoConfig(repoPath);
  return config.jiraSiteUrl ?? null;
}

/**
 * Set the Jira site URL for a repository
 */
export function setJiraSiteUrl(repoPath: string, siteUrl: string): void {
  updateRepoConfig(repoPath, { jiraSiteUrl: siteUrl });
}

/**
 * Get Jira credentials for a repository
 */
export function getJiraCredentials(repoPath: string): { email: string | null; apiToken: string | null } {
  const config = getRepoConfig(repoPath);
  return {
    email: config.jiraEmail ?? null,
    apiToken: config.jiraApiToken ?? null
  };
}

/**
 * Set Jira credentials for a repository
 */
export function setJiraCredentials(repoPath: string, email: string, apiToken: string): void {
  updateRepoConfig(repoPath, { jiraEmail: email, jiraApiToken: apiToken });
}

/**
 * Clear Jira configuration for a repository
 */
export function clearJiraConfig(repoPath: string): void {
  updateRepoConfig(repoPath, {
    jiraSiteUrl: undefined,
    jiraEmail: undefined,
    jiraApiToken: undefined
  });
}

/**
 * Get linked tickets for a specific branch
 */
export function getLinkedTickets(repoPath: string, branch: string): LinkedTicket[] {
  const config = getRepoConfig(repoPath);
  return config.branchTickets?.[branch] ?? [];
}

/**
 * Add a linked ticket to a branch
 */
export function addLinkedTicket(repoPath: string, branch: string, ticket: LinkedTicket): void {
  const config = getRepoConfig(repoPath);
  const branchTickets = config.branchTickets ?? {};
  const tickets = branchTickets[branch] ?? [];

  // Avoid duplicates
  if (tickets.some((t) => t.key === ticket.key)) {
    return;
  }

  updateRepoConfig(repoPath, {
    branchTickets: {
      ...branchTickets,
      [branch]: [...tickets, ticket]
    }
  });
}

/**
 * Remove a linked ticket from a branch
 */
export function removeLinkedTicket(repoPath: string, branch: string, ticketKey: string): void {
  const config = getRepoConfig(repoPath);
  const branchTickets = config.branchTickets ?? {};
  const tickets = branchTickets[branch] ?? [];

  updateRepoConfig(repoPath, {
    branchTickets: {
      ...branchTickets,
      [branch]: tickets.filter((t) => t.key !== ticketKey)
    }
  });
}

/**
 * Update a linked ticket's status
 */
export function updateTicketStatus(repoPath: string, branch: string, ticketKey: string, newStatus: string): void {
  const config = getRepoConfig(repoPath);
  const branchTickets = config.branchTickets ?? {};
  const tickets = branchTickets[branch] ?? [];

  updateRepoConfig(repoPath, {
    branchTickets: {
      ...branchTickets,
      [branch]: tickets.map((t) => (t.key === ticketKey ? { ...t, status: newStatus } : t))
    }
  });
}
