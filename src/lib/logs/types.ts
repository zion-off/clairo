export type LogEntry = {
  type: 'pr_created' | 'jira_status_changed' | 'manual';
  timestamp: string; // HH:MM
  title: string;
  description?: string;
};

export type LogFile = {
  date: string; // YYYY-MM-DD
  filename: string; // YYYY-MM-DD.md
  isToday: boolean;
};
