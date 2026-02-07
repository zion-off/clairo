import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
};

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
  const httpsMatch = remoteUrl.match(
    /https:\/\/github\.com\/(.+?)(?:\.git)?$/
  );
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
export async function listPRsForBranch(
  branch: string,
  repo: string
): Promise<GitHubResult<PRListItem[]>> {
  if (!(await isGhInstalled())) {
    return {
      success: false,
      error: 'GitHub CLI (gh) is not installed. Install from https://cli.github.com',
      errorType: 'not_installed',
    };
  }
  if (!(await isGhAuthenticated())) {
    return {
      success: false,
      error: "Not authenticated. Run 'gh auth login' to authenticate.",
      errorType: 'not_authenticated',
    };
  }

  const fields = 'number,title,state,author,createdAt,isDraft';

  // Option 2: Try gh pr view first (auto-detects PR for current branch, handles forks)
  // Note: Don't use --repo here - gh pr view auto-detects the correct upstream
  try {
    const { stdout } = await execAsync(
      `gh pr view --json ${fields} 2>/dev/null`
    );
    const pr = JSON.parse(stdout) as PRListItem;
    return { success: true, data: [pr] };
  } catch {
    // gh pr view failed - branch might not have a PR or isn't linked
  }

  // Option 1 fallback: Fetch all PRs and filter by branch name
  try {
    const { stdout } = await execAsync(
      `gh pr list --state open --json ${fields},headRefName --repo "${repo}" 2>/dev/null`
    );
    const allPrs = JSON.parse(stdout) as (PRListItem & { headRefName: string })[];

    // Filter by branch name (handles fork format like "username:branch")
    const prs = allPrs.filter((pr) =>
      pr.headRefName === branch || pr.headRefName.endsWith(`:${branch}`)
    );

    // Remove headRefName from result (not part of PRListItem type)
    const result = prs.map(({ headRefName: _, ...rest }) => rest);

    return { success: true, data: result };
  } catch {
    return { success: false, error: 'Failed to fetch PRs', errorType: 'api_error' };
  }
}

/**
 * Get detailed PR information
 */
export async function getPRDetails(
  prNumber: number,
  repo: string
): Promise<GitHubResult<PRDetails>> {
  if (!(await isGhInstalled())) {
    return {
      success: false,
      error: 'GitHub CLI (gh) is not installed',
      errorType: 'not_installed',
    };
  }
  if (!(await isGhAuthenticated())) {
    return {
      success: false,
      error: "Not authenticated. Run 'gh auth login'",
      errorType: 'not_authenticated',
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
      'reviewDecision',
      'commits',
      'assignees',
      'reviewRequests',
      'reviews',
      'statusCheckRollup',
    ].join(',');

    const { stdout } = await execAsync(
      `gh pr view ${prNumber} --json ${fields} --repo "${repo}"`
    );
    const pr = JSON.parse(stdout) as PRDetails;
    return { success: true, data: pr };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch PR details',
      errorType: 'api_error',
    };
  }
}

/**
 * Get the default branch for a repo
 */
export async function getDefaultBranch(repo: string): Promise<GitHubResult<string>> {
  if (!(await isGhInstalled())) {
    return {
      success: false,
      error: 'GitHub CLI (gh) is not installed',
      errorType: 'not_installed',
    };
  }
  if (!(await isGhAuthenticated())) {
    return {
      success: false,
      error: "Not authenticated. Run 'gh auth login'",
      errorType: 'not_authenticated',
    };
  }

  try {
    const { stdout } = await execAsync(
      `gh repo view "${repo}" --json defaultBranchRef --jq '.defaultBranchRef.name'`
    );
    return { success: true, data: stdout.trim() };
  } catch {
    return {
      success: false,
      error: 'Failed to get default branch',
      errorType: 'api_error',
    };
  }
}
