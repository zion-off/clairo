import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const intervals: Array<[number, string]> = [
    [86400 * 365, 'year'],
    [86400 * 30, 'month'],
    [86400 * 7, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute']
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export type GitHubResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      errorType: 'not_installed' | 'not_authenticated' | 'api_error';
    };

export type PRListItem = {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author: { login: string };
  createdAt: string;
  isDraft: boolean;
};

export type StatusCheck = {
  __typename: string;
  name?: string;
  context?: string;
  status?: string;
  conclusion?: string;
  state?: string;
  startedAt?: string;
  workflowName?: string;
};

export type CheckStatus = 'success' | 'failure' | 'pending' | 'skipped';

export function resolveCheckStatus(check: StatusCheck): CheckStatus {
  const conclusion = check.conclusion ?? check.state;
  if (conclusion === 'SUCCESS') return 'success';
  if (conclusion === 'FAILURE' || conclusion === 'ERROR') return 'failure';
  if (conclusion === 'SKIPPED' || conclusion === 'NEUTRAL') return 'skipped';
  if (
    conclusion === 'PENDING' ||
    check.status === 'IN_PROGRESS' ||
    check.status === 'QUEUED' ||
    check.status === 'WAITING'
  )
    return 'pending';
  return 'pending';
}

export const CHECK_COLORS: Record<CheckStatus, string> = {
  success: 'green',
  failure: 'red',
  pending: 'yellow',
  skipped: 'gray'
};
export const CHECK_ICONS: Record<CheckStatus, string> = { success: '✓', failure: '✗', pending: '●', skipped: '○' };
export const CHECK_SORT_ORDER: Record<CheckStatus, number> = { failure: 0, pending: 1, skipped: 2, success: 3 };

export function resolveReviewDisplay(reviewDecision: string | null): { text: string; color: string } {
  const status = reviewDecision ?? 'PENDING';
  if (status === 'APPROVED') return { text: status, color: 'green' };
  if (status === 'CHANGES_REQUESTED') return { text: status, color: 'red' };
  return { text: status, color: 'yellow' };
}

export function resolveMergeDisplay(pr: PRDetails | null): { text: string; color: string } {
  if (!pr) return { text: 'UNKNOWN', color: 'yellow' };
  if (pr.state === 'MERGED') return { text: 'MERGED', color: 'magenta' };
  if (pr.state === 'CLOSED') return { text: 'CLOSED', color: 'red' };
  if (pr.isDraft) return { text: 'DRAFT', color: 'yellow' };
  if (pr.mergeable === 'MERGEABLE') return { text: 'MERGEABLE', color: 'green' };
  if (pr.mergeable === 'CONFLICTING') return { text: 'CONFLICTING', color: 'red' };
  return { text: pr.mergeable ?? 'UNKNOWN', color: 'yellow' };
}

export type PRDetails = {
  number: number;
  title: string;
  body: string;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author: { login: string };
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  baseRefName: string;
  headRefName: string;
  additions: number;
  deletions: number;
  labels: Array<{ name: string }>;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  commits: Array<{ oid: string; messageHeadline: string }>;
  assignees: Array<{ login: string }>;
  reviewRequests: Array<{ login?: string; name?: string; slug?: string }>;
  reviews: Array<{ author: { login: string }; state: string }>;
  statusCheckRollup: StatusCheck[] | null;
};

/**
 * Check if gh CLI is installed
 */
export async function isGhInstalled(): Promise<boolean> {
  try {
    await execAsync('gh --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if gh CLI is authenticated
 */
export async function isGhAuthenticated(): Promise<boolean> {
  try {
    await execAsync('gh auth status');
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a remote URL to extract owner/repo format
 */
export function getRepoFromRemote(remoteUrl: string): string | null {
  // Handle SSH: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/git@github\.com:(.+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1].replace(/\.git$/, '');

  // Handle HTTPS: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return httpsMatch[1].replace(/\.git$/, '');

  return null;
}

/**
 * List PRs for a specific branch
 *
 * Strategy:
 * 1. Try `gh pr view` to auto-detect the PR for the current branch (handles forks correctly)
 * 2. Fall back to fetching all PRs and filtering by branch name
 */
export async function listPRsForBranch(branch: string, repo: string): Promise<GitHubResult<PRListItem[]>> {
  if (!(await isGhInstalled())) {
    return {
      success: false,
      error: 'GitHub CLI (gh) is not installed. Install from https://cli.github.com',
      errorType: 'not_installed'
    };
  }
  if (!(await isGhAuthenticated())) {
    return {
      success: false,
      error: "Not authenticated. Run 'gh auth login' to authenticate.",
      errorType: 'not_authenticated'
    };
  }

  const fields = 'number,title,state,author,createdAt,isDraft';

  // Option 2: Try gh pr view first (auto-detects PR for current branch, handles forks)
  // Note: Don't use --repo here - gh pr view auto-detects the correct upstream
  try {
    const { stdout } = await execAsync(`gh pr view --json ${fields} 2>/dev/null`);
    const pr = JSON.parse(stdout) as PRListItem;
    return { success: true, data: [pr] };
  } catch {
    // gh pr view failed - branch might not have a PR or isn't linked
  }

  // Option 1 fallback: Query PRs by head branch name (server-side filter)
  try {
    const { stdout } = await execAsync(
      `gh pr list --state open --head "${branch}" --json ${fields} --repo "${repo}" 2>/dev/null`
    );
    const prs = JSON.parse(stdout) as PRListItem[];

    return { success: true, data: prs };
  } catch {
    return { success: false, error: 'Failed to fetch PRs', errorType: 'api_error' };
  }
}

/**
 * Get detailed PR information
 */
export async function getPRDetails(prNumber: number, repo: string): Promise<GitHubResult<PRDetails>> {
  if (!(await isGhInstalled())) {
    return {
      success: false,
      error: 'GitHub CLI (gh) is not installed',
      errorType: 'not_installed'
    };
  }
  if (!(await isGhAuthenticated())) {
    return {
      success: false,
      error: "Not authenticated. Run 'gh auth login'",
      errorType: 'not_authenticated'
    };
  }

  try {
    const fields = [
      'number',
      'title',
      'body',
      'url',
      'state',
      'author',
      'createdAt',
      'updatedAt',
      'isDraft',
      'mergeable',
      'baseRefName',
      'headRefName',
      'additions',
      'deletions',
      'labels',
      'reviewDecision',
      'commits',
      'assignees',
      'reviewRequests',
      'reviews',
      'statusCheckRollup'
    ].join(',');

    const { stdout } = await execAsync(`gh pr view ${prNumber} --json ${fields} --repo "${repo}"`);
    const pr = JSON.parse(stdout) as PRDetails;
    return { success: true, data: pr };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch PR details',
      errorType: 'api_error'
    };
  }
}

/**
 * Open PR creation page in browser
 * Returns a promise that resolves when the browser command completes
 */
export function openPRCreationPage(owner: string, branch: string, onComplete?: (error: Error | null) => void): void {
  const headFlag = `${owner}:${branch}`;
  exec(`gh pr create --web --head "${headFlag}"`, (error) => {
    // Emit resize to refresh TUI after returning from browser
    process.stdout.emit('resize');
    onComplete?.(error);
  });
}

/**
 * Open PR creation page with pre-filled title and body
 */
export function openPRCreationPageWithContent(
  owner: string,
  branch: string,
  title: string,
  body: string,
  onComplete?: (error: Error | null) => void
): void {
  const headFlag = `${owner}:${branch}`;
  const args = ['pr', 'create', '--web', '--head', headFlag, '--title', title, '--body', body];
  execFile('gh', args, (error) => {
    process.stdout.emit('resize');
    onComplete?.(error);
  });
}

/**
 * Update an existing PR's title and body
 */
export function editPRDescription(
  prNumber: number,
  repo: string,
  title: string,
  body: string,
  onComplete?: (error: Error | null) => void
): void {
  const args = [
    'api',
    `repos/${repo}/pulls/${prNumber}`,
    '--method',
    'PATCH',
    '--field',
    `title=${title}`,
    '--field',
    `body=${body}`
  ];
  execFile('gh', args, (error, _stdout, stderr) => {
    if (error) {
      const message = stderr?.trim() || error.message;
      onComplete?.(new Error(message));
    } else {
      onComplete?.(null);
    }
  });
}

/**
 * Get the default branch for a repo
 */
export async function getDefaultBranch(repo: string): Promise<GitHubResult<string>> {
  if (!(await isGhInstalled())) {
    return {
      success: false,
      error: 'GitHub CLI (gh) is not installed',
      errorType: 'not_installed'
    };
  }
  if (!(await isGhAuthenticated())) {
    return {
      success: false,
      error: "Not authenticated. Run 'gh auth login'",
      errorType: 'not_authenticated'
    };
  }

  try {
    const { stdout } = await execAsync(`gh repo view "${repo}" --json defaultBranchRef --jq '.defaultBranchRef.name'`);
    return { success: true, data: stdout.trim() };
  } catch {
    return {
      success: false,
      error: 'Failed to get default branch',
      errorType: 'api_error'
    };
  }
}
