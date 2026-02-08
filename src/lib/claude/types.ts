export type ClaudeResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorType: 'not_installed' | 'execution_error' | 'unknown' };
