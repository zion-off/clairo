import { appendToLog, formatTimestamp, getTodayDate } from './index';

/**
 * Log a PR creation event
 */
export function logPRCreated(prNumber: number, title: string, jiraTickets: string[]): void {
  const timestamp = formatTimestamp();
  const today = getTodayDate();

  let entry = `## ${timestamp} - Created PR #${prNumber}\n\n${title}\n`;

  if (jiraTickets.length > 0) {
    entry += `Jira: ${jiraTickets.join(', ')}\n`;
  }

  entry += '\n';

  appendToLog(today, entry);
}

/**
 * Log a Jira ticket status change
 */
export function logJiraStatusChanged(
  ticketKey: string,
  ticketName: string,
  oldStatus: string,
  newStatus: string
): void {
  const timestamp = formatTimestamp();
  const today = getTodayDate();

  const entry = `## ${timestamp} - Updated Jira ticket\n\n${ticketKey}: ${ticketName}\n${oldStatus} → ${newStatus}\n\n`;

  appendToLog(today, entry);
}

/**
 * Log a Jira ticket assignee change
 */
export function logJiraAssigneeChanged(
  ticketKey: string,
  ticketName: string,
  action: 'assigned' | 'unassigned',
  displayName?: string
): void {
  const timestamp = formatTimestamp();
  const today = getTodayDate();

  const detail = action === 'assigned' && displayName ? `Assigned to ${displayName}` : 'Unassigned';
  const entry = `## ${timestamp} - Updated Jira ticket\n\n${ticketKey}: ${ticketName}\n${detail}\n\n`;

  appendToLog(today, entry);
}
