export type TabId = 'logs' | 'jira-browser' | 'pull-requests';

export type TabConfig = {
  id: TabId;
  label: string;
};

export const COLUMN2_TABS: TabConfig[] = [
  { id: 'logs', label: 'Logs' },
  { id: 'jira-browser', label: 'Jira' },
  { id: 'pull-requests', label: 'PRs' }
];
