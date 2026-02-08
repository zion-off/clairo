import { RepositoryConfig, loadConfig, saveConfig } from '../config/index.js';

/**
 * Get config for a specific repository
 */
export function getRepoConfig(repoPath: string): RepositoryConfig {
  const config = loadConfig();
  const repos = config.repositories ?? {};
  return repos[repoPath] ?? {};
}

/**
 * Update config for a specific repository
 */
export function updateRepoConfig(repoPath: string, updates: Partial<RepositoryConfig>): void {
  const config = loadConfig();
  if (!config.repositories) {
    config.repositories = {};
  }
  config.repositories[repoPath] = {
    ...config.repositories[repoPath],
    ...updates
  };
  saveConfig(config);
}

/**
 * Get the selected remote for a repository, with fallback logic
 */
export function getSelectedRemote(repoPath: string, availableRemotes: string[]): string | null {
  const repoConfig = getRepoConfig(repoPath);

  // If saved remote still exists, use it
  if (repoConfig.selectedRemote && availableRemotes.includes(repoConfig.selectedRemote)) {
    return repoConfig.selectedRemote;
  }

  // Default to 'origin' if available
  if (availableRemotes.includes('origin')) {
    return 'origin';
  }

  // Return first available remote
  return availableRemotes[0] ?? null;
}
