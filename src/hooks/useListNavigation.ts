import { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { useScrollToIndex } from './useScrollToIndex.js';

type UseListNavigationOptions<T> = {
  items: T[];
  totalItems?: number;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  isActive?: boolean;
};

/**
 * Manages keyboard-driven list navigation with scroll tracking.
 *
 * Handles highlighted index state, j/k and arrow key movement, space-to-select,
 * and automatic scroll-into-view via a returned `scrollRef` for `ScrollView`.
 *
 * When `isActive` is true, the hook registers its own `useInput` handler for
 * navigation and selection. When false (or omitted), input handling is disabled
 * and callers can drive navigation manually via `prev()`, `next()`, and `setIndex()`.
 *
 * Use `totalItems` when the navigable range exceeds `items.length` (e.g. a virtual
 * "Create new" entry appended to the list).
 */
export function useListNavigation<T>({
  items,
  totalItems,
  selectedIndex,
  onSelect,
  isActive
}: UseListNavigationOptions<T>) {
  const navLength = totalItems ?? items.length;
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const scrollRef = useScrollToIndex(highlightedIndex);

  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex >= 0) {
      setHighlightedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const prev = () => setHighlightedIndex((i) => Math.max(0, i - 1));
  const next = () => setHighlightedIndex((i) => Math.min(navLength - 1, i + 1));

  useInput(
    (input, key) => {
      if (navLength === 0) return;

      if (key.upArrow || input === 'k') {
        prev();
      }
      if (key.downArrow || input === 'j') {
        next();
      }
      if (input === ' ' && onSelect) {
        onSelect(highlightedIndex);
      }
    },
    { isActive: isActive === true }
  );

  const clampedIndex = navLength === 0 ? 0 : Math.min(highlightedIndex, Math.max(0, navLength - 1));

  return {
    highlightedIndex: clampedIndex,
    index: clampedIndex,
    scrollRef,
    prev,
    next,
    reset: () => setHighlightedIndex(0),
    setIndex: setHighlightedIndex
  };
}
