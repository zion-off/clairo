import { JiraViewSource, SavedJiraView } from '../config/index';
import { getRepoConfig, updateRepoConfig } from '../github/config';

/**
 * Get all saved Jira views for a repository
 */
export function getSavedViews(repoPath: string): SavedJiraView[] {
  const config = getRepoConfig(repoPath);
  return config.savedJiraViews ?? [];
}

/**
 * Add a saved Jira view to a repository
 */
export function addSavedView(repoPath: string, name: string, url: string, source: JiraViewSource): SavedJiraView {
  const views = getSavedViews(repoPath);
  const view: SavedJiraView = {
    id: Date.now().toString(36),
    name,
    url,
    source,
    savedAt: new Date().toISOString()
  };
  updateRepoConfig(repoPath, { savedJiraViews: [...views, view] });
  return view;
}

/**
 * Rename a saved Jira view
 */
export function renameSavedView(repoPath: string, viewId: string, newName: string): void {
  const views = getSavedViews(repoPath);
  updateRepoConfig(repoPath, {
    savedJiraViews: views.map((v) => (v.id === viewId ? { ...v, name: newName } : v))
  });
}

/**
 * Remove a saved Jira view from a repository
 */
export function removeSavedView(repoPath: string, viewId: string): void {
  const views = getSavedViews(repoPath);
  updateRepoConfig(repoPath, {
    savedJiraViews: views.filter((v) => v.id !== viewId)
  });
}
