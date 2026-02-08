import { JiraIssue, JiraResult } from './types.js';

export type JiraAuth = {
  siteUrl: string;
  email: string;
  apiToken: string;
};

/**
 * Create Basic auth header value
 */
function createAuthHeader(email: string, apiToken: string): string {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Make an authenticated request to the Jira API
 */
async function jiraFetch(
  auth: JiraAuth,
  endpoint: string,
  options?: { method?: 'GET' | 'POST'; body?: unknown }
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  const url = `${auth.siteUrl}/rest/api/3${endpoint}`;
  const method = options?.method ?? 'GET';

  try {
    const headers: Record<string, string> = {
      Authorization: createAuthHeader(auth.email, auth.apiToken),
      Accept: 'application/json'
    };

    const fetchOptions: RequestInit = { method, headers };

    if (options?.body) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, status: response.status, error: text };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { ok: true, status: response.status, data: null };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, status: 0, error: message };
  }
}

/**
 * Validate Jira credentials by fetching current user
 */
export async function validateCredentials(auth: JiraAuth): Promise<JiraResult<unknown>> {
  const result = await jiraFetch(auth, '/myself');

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        success: false,
        error: 'Invalid credentials. Check your email and API token.',
        errorType: 'auth_error'
      };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to connect to Jira',
      errorType: 'api_error'
    };
  }

  return { success: true, data: result.data };
}

/**
 * Get a Jira issue by key
 */
export async function getIssue(auth: JiraAuth, ticketKey: string): Promise<JiraResult<JiraIssue>> {
  const result = await jiraFetch(auth, `/issue/${ticketKey}?fields=summary,status`);

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        success: false,
        error: 'Authentication failed',
        errorType: 'auth_error'
      };
    }
    if (result.status === 404) {
      return {
        success: false,
        error: `Ticket ${ticketKey} not found`,
        errorType: 'invalid_ticket'
      };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to fetch issue',
      errorType: 'api_error'
    };
  }

  return { success: true, data: result.data as JiraIssue };
}

export type JiraTransition = {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
  };
};

/**
 * Get available transitions for an issue
 */
export async function getTransitions(auth: JiraAuth, ticketKey: string): Promise<JiraResult<JiraTransition[]>> {
  const result = await jiraFetch(auth, `/issue/${ticketKey}/transitions`);

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        success: false,
        error: 'Authentication failed',
        errorType: 'auth_error'
      };
    }
    if (result.status === 404) {
      return {
        success: false,
        error: `Ticket ${ticketKey} not found`,
        errorType: 'invalid_ticket'
      };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to fetch transitions',
      errorType: 'api_error'
    };
  }

  const data = result.data as { transitions: JiraTransition[] };
  return { success: true, data: data.transitions };
}

/**
 * Apply a transition to an issue (change status)
 */
export async function applyTransition(
  auth: JiraAuth,
  ticketKey: string,
  transitionId: string
): Promise<JiraResult<null>> {
  const result = await jiraFetch(auth, `/issue/${ticketKey}/transitions`, {
    method: 'POST',
    body: { transition: { id: transitionId } }
  });

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        success: false,
        error: 'Authentication failed',
        errorType: 'auth_error'
      };
    }
    if (result.status === 404) {
      return {
        success: false,
        error: `Ticket ${ticketKey} not found`,
        errorType: 'invalid_ticket'
      };
    }
    return {
      success: false,
      error: result.error ?? 'Failed to apply transition',
      errorType: 'api_error'
    };
  }

  return { success: true, data: null };
}
