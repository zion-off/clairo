import { execSync } from 'child_process';

export type GitRemote = {
  name: string;
  url: string;
};

export type GitResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Check if the current directory is inside a git repository
 */
export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the root path of the git repository (used as config key)
 */
export function getRepoRoot(): GitResult<string> {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { success: true, data: root };
  } catch {
    return { success: false, error: 'Not a git repository' };
  }
}

/**
 * List all git remotes (deduplicated)
 */
export function listRemotes(): GitResult<GitRemote[]> {
  try {
    const output = execSync('git remote -v', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const remotes: GitRemote[] = [];
    const seen = new Set<string>();

    for (const line of output.trim().split('\n')) {
      if (!line) continue;
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (match && match[3] === 'fetch' && !seen.has(match[1])) {
        seen.add(match[1]);
        remotes.push({ name: match[1], url: match[2] });
      }
    }

    return { success: true, data: remotes };
  } catch {
    return { success: false, error: 'Failed to list remotes' };
  }
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(): GitResult<string> {
  try {
    const branch = execSync('git branch --show-current', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!branch) {
      return { success: false, error: 'Detached HEAD state' };
    }
    return { success: true, data: branch };
  } catch {
    return { success: false, error: 'Failed to get current branch' };
  }
}

/**
 * Find which remote has the given branch pushed, and return the owner
 */
export function findRemoteWithBranch(branch: string): GitResult<{ remote: string; owner: string }> {
  try {
    const remoteBranches = execSync('git branch -r', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const remotes = listRemotes();
    if (!remotes.success) {
      return { success: false, error: 'Failed to list remotes' };
    }

    for (const remote of remotes.data) {
      if (remoteBranches.includes(`${remote.name}/${branch}`)) {
        // Extract owner from remote URL
        // SSH: git@github.com:owner/repo.git
        const sshMatch = remote.url.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);
        if (sshMatch) {
          return { success: true, data: { remote: remote.name, owner: sshMatch[1] } };
        }
        // HTTPS: https://github.com/owner/repo.git
        const httpsMatch = remote.url.match(/https:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
        if (httpsMatch) {
          return { success: true, data: { remote: remote.name, owner: httpsMatch[1] } };
        }
      }
    }

    return { success: false, error: 'Branch not found on any remote' };
  } catch {
    return { success: false, error: 'Failed to find remote with branch' };
  }
}
