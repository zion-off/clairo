export type TabId = 'logs' | 'jira-browser';

export type TabConfig = {
  id: TabId;
  label: string;
};

export const COLUMN2_TABS: TabConfig[] = [
  { id: 'logs', label: 'Logs' },
  { id: 'jira-browser', label: 'Jira' }
];
