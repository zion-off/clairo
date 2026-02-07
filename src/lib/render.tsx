import { ReactNode } from 'react';
import { RenderOptions, render as inkRender } from 'ink';
import { Screen } from './Screen.js';

const ENTER_ALT_BUFFER = '\x1b[?1049h';
const EXIT_ALT_BUFFER = '\x1b[?1049l';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';

export function render(node: ReactNode, options?: RenderOptions) {
  process.stdout.write(ENTER_ALT_BUFFER + CLEAR_SCREEN);

  const element = <Screen>{node}</Screen>;
  const instance = inkRender(element, options);

  setImmediate(() => instance.rerender(element));

  const cleanup = () => process.stdout.write(EXIT_ALT_BUFFER);

  const originalWaitUntilExit = instance.waitUntilExit.bind(instance);
  instance.waitUntilExit = async () => {
    await originalWaitUntilExit();
    cleanup();
  };

  process.on('exit', cleanup);

  const handleSignal = () => {
    cleanup();
    instance.unmount();
    process.exit(0);
  };
  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  return instance;
}
