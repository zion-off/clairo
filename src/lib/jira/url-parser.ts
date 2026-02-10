import { JiraViewSource } from '../config/index.js';

/**
 * Parse a Jira URL into a view source.
 *
 * Supported formats:
 * - Filter:  https://company.atlassian.net/issues/?filter=12345
 * - JQL:     https://company.atlassian.net/issues/?jql=project%3DPROJ
 * - Board:   https://company.atlassian.net/jira/software/projects/PROJ/boards/123
 *            https://company.atlassian.net/jira/software/c/projects/PROJ/boards/123
 *            https://company.atlassian.net/jira/software/projects/PROJ/boards/123/backlog
 *
 * Returns null if the URL format is not recognized.
 */
export function parseJiraUrl(input: string): JiraViewSource | null {
  const trimmed = input.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Check for filter parameter: /issues/?filter=12345
  const filterId = url.searchParams.get('filter');
  if (filterId && /^\d+$/.test(filterId)) {
    return { type: 'filter', filterId };
  }

  // Check for JQL parameter: /issues/?jql=...
  const jql = url.searchParams.get('jql');
  if (jql) {
    return { type: 'jql', jql };
  }

  // Check for board URL: /jira/software/[c/]projects/PROJ/boards/123[/backlog]
  const boardMatch = url.pathname.match(/\/boards\/(\d+)/);
  if (boardMatch) {
    return { type: 'board', boardId: boardMatch[1] };
  }

  return null;
}

/**
 * Generate a human-readable name from a Jira URL.
 */
export function generateViewName(input: string): string {
  const source = parseJiraUrl(input);
  if (!source) return 'Jira View';

  switch (source.type) {
    case 'filter':
      return `Filter #${source.filterId}`;
    case 'jql':
      return truncate(source.jql, 40);
    case 'board':
      return `Board #${source.boardId}`;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
