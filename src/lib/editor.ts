import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Open content in the user's preferred editor and return the edited content.
 * Uses $VISUAL, $EDITOR, or falls back to 'vi'.
 */
export function openInEditor(content: string, filename: string): string | null {
  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  const tempDir = mkdtempSync(join(tmpdir(), 'clairo-'));
  const tempFile = join(tempDir, filename);

  try {
    writeFileSync(tempFile, content);
    const result = spawnSync(editor, [tempFile], {
      stdio: 'inherit'
    });

    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.emit('resize');

    if (result.status !== 0) {
      return null;
    }

    return readFileSync(tempFile, 'utf-8');
  } finally {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
