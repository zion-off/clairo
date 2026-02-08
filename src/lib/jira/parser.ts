/**
 * Regex pattern for Jira ticket keys: PROJECT-123
 * Project key: 2+ uppercase letters
 * Issue number: 1+ digits
 */
const TICKET_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

/**
 * Check if a string is a valid Jira ticket key format
 */
export function isValidTicketKeyFormat(key: string): boolean {
  return TICKET_KEY_PATTERN.test(key.toUpperCase());
}

/**
 * Parse a ticket key from various input formats:
 * - "PROJ-123"
 * - "proj-123" (lowercase)
 * - "https://company.atlassian.net/browse/PROJ-123"
 * - "https://company.atlassian.net/browse/PROJ-123?someparam=value"
 *
 * Returns the normalized uppercase ticket key, or null if invalid
 */
export function parseTicketKey(input: string): string | null {
  const trimmed = input.trim();

  // Try to extract from URL first
  const urlMatch = trimmed.match(/\/browse\/([A-Za-z][A-Za-z0-9]+-\d+)/i);
  if (urlMatch) {
    return urlMatch[1].toUpperCase();
  }

  // Try direct ticket key
  const upperInput = trimmed.toUpperCase();
  if (isValidTicketKeyFormat(upperInput)) {
    return upperInput;
  }

  return null;
}

/**
 * Extract the Jira site URL from a full ticket URL
 * e.g., "https://company.atlassian.net/browse/PROJ-123" -> "https://company.atlassian.net"
 *
 * Returns null if not a valid Jira URL
 */
export function extractSiteUrl(ticketUrl: string): string | null {
  try {
    const url = new URL(ticketUrl.trim());
    // Check if it looks like a Jira browse URL
    if (url.pathname.includes('/browse/')) {
      return `${url.protocol}//${url.host}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract a Jira ticket key from any text (branch name, PR title, etc.)
 * Supports formats like:
 * - "PROJ-123"
 * - "feature/PROJ-123"
 * - "feature/PROJ-123-add-login"
 * - "PROJ-123-some-description"
 * - "[PROJ-123] Fix bug"
 * - "PROJ-123: Add feature"
 *
 * Returns the normalized uppercase ticket key, or null if not found
 */
export function extractTicketKey(text: string): string | null {
  // Match PROJ-123 pattern anywhere in the text
  const match = text.match(/([A-Za-z][A-Za-z0-9]+-\d+)/);
  if (match) {
    const candidate = match[1].toUpperCase();
    if (isValidTicketKeyFormat(candidate)) {
      return candidate;
    }
  }
  return null;
}
