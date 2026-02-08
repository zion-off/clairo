import { exec } from 'child_process';

/**
 * Copy text to the system clipboard.
 * Cross-platform: uses pbcopy on macOS, xclip on Linux, clip on Windows.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const command =
    process.platform === 'darwin' ? 'pbcopy' : process.platform === 'win32' ? 'clip' : 'xclip -selection clipboard';

  try {
    const child = exec(command);
    child.stdin?.write(text);
    child.stdin?.end();
    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Clipboard command exited with code ${code}`));
      });
    });
    return true;
  } catch {
    return false;
  }
}
