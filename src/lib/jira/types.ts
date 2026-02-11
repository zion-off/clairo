export type { LinkedTicket } from '../config/index';

export type JiraResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorType: 'not_configured' | 'auth_error' | 'api_error' | 'invalid_ticket' };

export type JiraIssue = {
  key: string;
  fields: {
    summary: string;
    status: { name: string; [key: string]: unknown };
    [key: string]: unknown;
  };
};
