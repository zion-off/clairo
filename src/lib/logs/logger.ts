import { appendToLog, formatTimestamp, getTodayDate } from './index.js';

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
  oldStatus: string,
  newStatus: string
): void {
  const timestamp = formatTimestamp();
  const today = getTodayDate();

  const entry = `## ${timestamp} - Updated Jira ticket\n\n${ticketKey}: ${oldStatus} → ${newStatus}\n\n`;

  appendToLog(today, entry);
}
