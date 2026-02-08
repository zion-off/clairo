import { ChildProcess, exec } from 'child_process';
import { ClaudeResult } from './types.js';

export type ClaudeProcess = {
  promise: Promise<ClaudeResult<string>>;
  cancel: () => void;
};

/**
 * Run Claude CLI with a prompt and return the result
 */
export function runClaudePrompt(prompt: string): ClaudeProcess {
  let childProcess: ChildProcess | null = null;
  let cancelled = false;

  const promise = new Promise<ClaudeResult<string>>((resolve) => {
    // Escape the prompt for shell and use JSON output format
    const escapedPrompt = prompt.replace(/'/g, "'\\''").replace(/\n/g, '\\n');
    const command = `claude -p $'${escapedPrompt}' --output-format json < /dev/null`;

    childProcess = exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (cancelled) {
        resolve({
          success: false,
          error: 'Cancelled',
          errorType: 'execution_error'
        });
        return;
      }

      if (error) {
        // Check if Claude CLI is not installed
        if (
          error.message.includes('command not found') ||
          error.message.includes('ENOENT') ||
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          resolve({
            success: false,
            error: 'Claude CLI not installed. Run: npm install -g @anthropic-ai/claude-code',
            errorType: 'not_installed'
          });
          return;
        }

        resolve({
          success: false,
          error: stderr?.trim() || error.message,
          errorType: 'execution_error'
        });
        return;
      }

      if (!stdout?.trim()) {
        resolve({
          success: false,
          error: stderr?.trim() || 'Claude returned empty response',
          errorType: 'execution_error'
        });
        return;
      }

      // Parse JSON response
      try {
        const json = JSON.parse(stdout.trim());
        if (json.is_error) {
          resolve({
            success: false,
            error: json.result || 'Claude returned an error',
            errorType: 'execution_error'
          });
          return;
        }
        resolve({
          success: true,
          data: json.result || stdout.trim()
        });
      } catch {
        // If JSON parsing fails, return raw output
        resolve({
          success: true,
          data: stdout.trim()
        });
      }
    });
  });

  const cancel = () => {
    cancelled = true;
    if (childProcess) {
      childProcess.kill('SIGTERM');
    }
  };

  return { promise, cancel };
}

/**
 * Generate standup notes from log content
 */
export function generateStandupNotes(logContent: string): ClaudeProcess {
  const prompt = `You are helping a developer prepare standup notes. Based on the following log entries, generate concise standup notes that summarize what was accomplished.

Format the output as bullet points grouped by category (e.g., Features, Bug Fixes, Refactoring, etc.). Keep it brief and professional.

Log entries:
${logContent}

Generate the standup notes:`;
  return runClaudePrompt(prompt);
}
