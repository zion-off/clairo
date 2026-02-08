import { useEffect, useState } from 'react';

/**
 * Detects when the terminal window gains/loses OS focus.
 * Uses DECSET 1004 escape sequences supported by most modern terminals.
 *
 * Returns:
 * - isFocused: current focus state (null until first event)
 * - focusCount: increments each time window gains focus (useful for triggering refreshes)
 */
export function useTerminalFocus() {
  const [isFocused, setIsFocused] = useState<boolean | null>(null);
  const [focusCount, setFocusCount] = useState(0);

  useEffect(() => {
    // Enable focus reporting: \x1b[?1004h
    process.stdout.write('\x1b[?1004h');

    const handleData = (data: Buffer) => {
      const str = data.toString();

      // Focus in: \x1b[I
      if (str.includes('\x1b[I')) {
        setIsFocused(true);
        setFocusCount((c) => c + 1);
      }

      // Focus out: \x1b[O
      if (str.includes('\x1b[O')) {
        setIsFocused(false);
      }
    };

    process.stdin.on('data', handleData);

    return () => {
      // Disable focus reporting: \x1b[?1004l
      process.stdout.write('\x1b[?1004l');
      process.stdin.off('data', handleData);
    };
  }, []);

  return { isFocused, focusCount };
}
