export type TabId = 'logs' | 'tbd';

export type TabConfig = {
  id: TabId;
  label: string;
};

export const COLUMN2_TABS: TabConfig[] = [
  { id: 'logs', label: 'Logs' },
  { id: 'tbd', label: 'TBD' }
];
