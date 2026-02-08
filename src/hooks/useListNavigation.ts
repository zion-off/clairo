import { useCallback, useState } from 'react';

/**
 * Generic list navigation hook for managing highlighted index.
 *
 * @param length - Current length of the list (used to clamp index)
 */
export function useListNavigation(length: number) {
  const [index, setIndex] = useState(0);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(length - 1, i + 1));
  }, [length]);

  // Clamp index when length changes
  const clampedIndex = Math.min(index, Math.max(0, length - 1));

  const reset = useCallback(() => setIndex(0), []);

  return {
    index: length === 0 ? 0 : clampedIndex,
    prev,
    next,
    reset,
    setIndex
  };
}
