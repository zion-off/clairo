import { SavedJiraView } from '../config/index';
import { JiraAuth, jiraFetch } from './api';
import { JiraResult } from './types';

export type JiraSprint = {
  id: number;
  name: string;
  state: string; // 'active' | 'future' | 'closed'
};

export type JiraSearchIssue = {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee?: { accountId: string; displayName: string } | null;
    priority?: { name: string } | null;
    issuetype?: { name: string } | null;
    sprint?: JiraSprint | null;
    closedSprints?: JiraSprint[];
  };
};

export type JiraSearchResult = {
  issues: JiraSearchIssue[];
  total: number;
  startAt: number;
  maxResults: number;
};

/**
 * Search Jira issues using JQL
 */
export async function searchIssues(
  auth: JiraAuth,
  jql: string,
  opts?: { startAt?: number; maxResults?: number }
): Promise<JiraResult<JiraSearchResult>> {
  const params = new URLSearchParams({
    jql,
    fields: 'summary,status,assignee,priority,issuetype,sprint,closedSprints',
    startAt: String(opts?.startAt ?? 0),
    maxResults: String(opts?.maxResults ?? 50)
  });

  const result = await jiraFetch(auth, `/search?${params.toString()}`);

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return { success: false, error: 'Authentication failed', errorType: 'auth_error' };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to search issues',
      errorType: 'api_error'
    };
  }

  return { success: true, data: result.data as JiraSearchResult };
}

/**
 * Get a Jira filter's JQL by filter ID
 */
export async function getFilterJql(auth: JiraAuth, filterId: string): Promise<JiraResult<string>> {
  const result = await jiraFetch(auth, `/filter/${filterId}`);

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return { success: false, error: 'Authentication failed', errorType: 'auth_error' };
    }
    if (result.status === 404) {
      return { success: false, error: `Filter ${filterId} not found`, errorType: 'api_error' };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to fetch filter',
      errorType: 'api_error'
    };
  }

  const data = result.data as { jql: string };
  return { success: true, data: data.jql };
}

/**
 * Get issues from a Jira board using the Agile API
 */
export async function getBoardIssues(
  auth: JiraAuth,
  boardId: string,
  opts?: { startAt?: number; maxResults?: number; jql?: string }
): Promise<JiraResult<JiraSearchResult>> {
  const params = new URLSearchParams({
    fields: 'summary,status,assignee,priority,issuetype,sprint,closedSprints',
    startAt: String(opts?.startAt ?? 0),
    maxResults: String(opts?.maxResults ?? 50)
  });
  if (opts?.jql) {
    params.set('jql', opts.jql);
  }

  const result = await jiraFetch(auth, `/board/${boardId}/issue?${params.toString()}`, {
    apiPrefix: '/rest/agile/1.0'
  });

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return { success: false, error: 'Authentication failed', errorType: 'auth_error' };
    }
    if (result.status === 404) {
      return { success: false, error: `Board ${boardId} not found`, errorType: 'api_error' };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to fetch board issues',
      errorType: 'api_error'
    };
  }

  return { success: true, data: result.data as JiraSearchResult };
}

/**
 * Escape a string for use inside a JQL text search
 */
function escapeJql(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Create a JQL search clause that handles both text and ticket IDs
 */
function createSearchClause(searchText: string): string {
  const escaped = escapeJql(searchText);
  // Full ticket ID like PROJ-123 or proj-123
  if (/^[A-Z]+-\d+$/i.test(searchText)) {
    return `(key = "${escaped}" OR text ~ "${escaped}")`;
  }
  // Just a number like 123 - match any ticket ending in that number
  if (/^\d+$/.test(searchText)) {
    return `(key ~ "*-${escaped}" OR text ~ "${escaped}")`;
  }
  return `text ~ "${escaped}"`;
}

/**
 * Append a search clause to a JQL query
 */
function appendTextSearch(jql: string, searchText: string): string {
  return `(${jql}) AND ${createSearchClause(searchText)}`;
}

/**
 * Create a JQL clause for assignee filtering
 */
function createAssigneeClause(filter: 'unassigned' | 'me'): string {
  if (filter === 'unassigned') return 'assignee is EMPTY';
  return 'assignee = currentUser()';
}

/**
 * Fetch a single page of issues for a saved view
 */
export async function fetchViewIssues(
  auth: JiraAuth,
  view: SavedJiraView,
  opts?: { startAt?: number; maxResults?: number; searchText?: string; assigneeFilter?: 'unassigned' | 'me' }
): Promise<JiraResult<JiraSearchResult>> {
  const { searchText, assigneeFilter, ...pageOpts } = opts ?? {};

  switch (view.source.type) {
    case 'jql': {
      let jql = view.source.jql;
      if (searchText) jql = appendTextSearch(jql, searchText);
      if (assigneeFilter) jql = `(${jql}) AND ${createAssigneeClause(assigneeFilter)}`;
      return searchIssues(auth, jql, pageOpts);
    }

    case 'filter': {
      const filterResult = await getFilterJql(auth, view.source.filterId);
      if (!filterResult.success) return filterResult as JiraResult<JiraSearchResult>;
      let jql = filterResult.data;
      if (searchText) jql = appendTextSearch(jql, searchText);
      if (assigneeFilter) jql = `(${jql}) AND ${createAssigneeClause(assigneeFilter)}`;
      return searchIssues(auth, jql, pageOpts);
    }

    case 'board': {
      const clauses: string[] = [];
      if (searchText) clauses.push(createSearchClause(searchText));
      if (assigneeFilter) clauses.push(createAssigneeClause(assigneeFilter));
      const jql = clauses.length > 0 ? clauses.join(' AND ') : undefined;
      return getBoardIssues(auth, view.source.boardId, { ...pageOpts, jql });
    }
  }
}

/**
 * Fetch ALL issues for a saved view, paginating through all results.
 */
export async function fetchAllViewIssues(auth: JiraAuth, view: SavedJiraView): Promise<JiraResult<JiraSearchResult>> {
  const pageSize = 100;
  const allIssues: JiraSearchIssue[] = [];
  let startAt = 0;
  let total = 0;

  while (true) {
    const result = await fetchViewIssues(auth, view, { startAt, maxResults: pageSize });
    if (!result.success) return result;

    allIssues.push(...result.data.issues);
    total = result.data.total;

    if (allIssues.length >= total || result.data.issues.length === 0) {
      break;
    }
    startAt += result.data.issues.length;
  }

  return {
    success: true,
    data: { issues: allIssues, total, startAt: 0, maxResults: total }
  };
}
