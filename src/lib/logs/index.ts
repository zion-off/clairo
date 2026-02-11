import { spawnSync } from 'child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { LogFile } from './types';

const LOGS_DIRECTORY = join(homedir(), '.clairo', 'logs');

/**
 * Get the logs directory path
 */
export function getLogsDirectory(): string {
  return LOGS_DIRECTORY;
}

/**
 * Ensure the logs directory exists
 */
export function ensureLogsDirectory(): void {
  if (!existsSync(LOGS_DIRECTORY)) {
    mkdirSync(LOGS_DIRECTORY, { recursive: true });
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current date and time in YYYY-MM-DD HH:MM format
 */
export function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * List all log files sorted by date (newest first)
 */
export function listLogFiles(): LogFile[] {
  ensureLogsDirectory();

  try {
    const files = readdirSync(LOGS_DIRECTORY);
    const today = getTodayDate();

    const logFiles: LogFile[] = files
      .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
      .map((file) => {
        const date = file.replace('.md', '');
        return {
          date,
          filename: file,
          isToday: date === today
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    return logFiles;
  } catch {
    return [];
  }
}

/**
 * Read a log file's content
 */
export function readLog(date: string): string | null {
  const filePath = join(LOGS_DIRECTORY, `${date}.md`);

  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Get the log file path for a date
 */
export function getLogFilePath(date: string): string {
  return join(LOGS_DIRECTORY, `${date}.md`);
}

/**
 * Check if a log file exists for a date
 */
export function logExists(date: string): boolean {
  return existsSync(getLogFilePath(date));
}

/**
 * Create an empty log file with header
 */
export function createEmptyLog(date: string): void {
  ensureLogsDirectory();

  const filePath = getLogFilePath(date);
  if (existsSync(filePath)) {
    return; // Already exists
  }

  const header = `# Log - ${date}\n`;
  writeFileSync(filePath, header);
}

/**
 * Append an entry to a log file (creates file with header if it doesn't exist)
 */
export function appendToLog(date: string, entry: string): void {
  ensureLogsDirectory();

  const filePath = getLogFilePath(date);

  // Create file with header if it doesn't exist
  if (!existsSync(filePath)) {
    const header = `# Log - ${date}\n\n`;
    writeFileSync(filePath, header);
  }

  // Append the entry
  appendFileSync(filePath, entry);
}

/**
 * Open a log file in the user's preferred editor
 */
export function openLogInEditor(date: string): boolean {
  const filePath = getLogFilePath(date);

  if (!existsSync(filePath)) {
    return false;
  }

  // Append timestamp before opening editor
  const timestamp = formatTimestamp();
  appendFileSync(filePath, `\n## ${timestamp}\n\n`);

  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';

  const result = spawnSync(editor, [filePath], {
    stdio: 'inherit'
  });

  // Clear screen and trigger resize to refresh TUI
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.emit('resize');

  return result.status === 0;
}

export * from './types';
