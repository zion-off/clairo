import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

const CONFIG_PATH = join(homedir(), '.clairo', 'config.json');

export type LinkedTicket = {
  key: string;
  summary: string;
  status: string;
  linkedAt: string;
};

export type JiraViewSource =
  | { type: 'filter'; filterId: string }
  | { type: 'jql'; jql: string }
  | { type: 'board'; boardId: string };

export type SavedJiraView = {
  id: string;
  name: string;
  url: string;
  source: JiraViewSource;
  savedAt: string;
};

export type RepositoryConfig = {
  selectedRemote?: string;
  jiraSiteUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  branchTickets?: Record<string, LinkedTicket[]>;
  savedJiraViews?: SavedJiraView[];
};

export type Config = {
  repositories?: Record<string, RepositoryConfig>;
  [key: string]: unknown;
};

const DEFAULT_CONFIG: Config = {};

/**
 * Load config from disk, returning default if not exists
 */
export function loadConfig(): Config {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return DEFAULT_CONFIG;
    }
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as Config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Save config to disk
 */
export function saveConfig(config: Config): void {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
