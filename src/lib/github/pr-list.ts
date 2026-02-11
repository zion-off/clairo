import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubResult, PRListItem, isGhAuthenticated, isGhInstalled } from './index';

const execAsync = promisify(exec);

type PRState = 'open' | 'closed' | 'all';

/**
 * List PRs for a repo, with optional state and search filters.
 * All filtering is server-side via gh CLI flags.
 */
export async function listPRs(
  repo: string,
  opts?: { state?: PRState; search?: string; limit?: number }
): Promise<GitHubResult<PRListItem[]>> {
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

  const fields = 'number,title,state,author,createdAt,isDraft,reviewDecision,statusCheckRollup';
  const state = opts?.state ?? 'open';
  const limit = opts?.limit ?? 30;
  const args = [`gh pr list`, `--state ${state}`, `--limit ${limit}`, `--json ${fields}`, `--repo "${repo}"`];

  if (opts?.search) {
    args.push(`--search "${opts.search.replace(/"/g, '\\"')}"`);
  }

  try {
    const { stdout } = await execAsync(`${args.join(' ')} 2>/dev/null`);
    const prs = JSON.parse(stdout) as PRListItem[];
    return { success: true, data: prs };
  } catch {
    return { success: false, error: 'Failed to fetch PRs', errorType: 'api_error' };
  }
}

export async function checkoutPR(prNumber: number, repo: string): Promise<GitHubResult<string>> {
  if (!(await isGhInstalled())) {
    return { success: false, error: 'gh CLI not installed', errorType: 'not_installed' };
  }
  if (!(await isGhAuthenticated())) {
    return { success: false, error: 'gh CLI not authenticated', errorType: 'not_authenticated' };
  }
  try {
    await execAsync(`gh pr checkout ${prNumber} --repo "${repo}" 2>&1`);
    return { success: true, data: `Checked out PR #${prNumber}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message.split('\n').pop() ?? e.message : 'Failed to checkout PR';
    return { success: false, error: msg, errorType: 'api_error' };
  }
}
