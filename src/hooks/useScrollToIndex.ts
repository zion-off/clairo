import { useEffect, useRef } from 'react';
import { ScrollViewRef } from 'ink-scroll-view';

/**
 * Auto-scrolls a ScrollView to keep the item at the given index visible.
 * Returns a ref to attach to the ScrollView component.
 */
export function useScrollToIndex(index: number) {
  const scrollRef = useRef<ScrollViewRef>(null);

  useEffect(() => {
    const ref = scrollRef.current;
    if (!ref) return;

    const pos = ref.getItemPosition(index);
    const viewportHeight = ref.getViewportHeight();
    const scrollOffset = ref.getScrollOffset();

    if (!pos) return;

    if (pos.top < scrollOffset) {
      ref.scrollTo(pos.top);
    } else if (pos.top + pos.height > scrollOffset + viewportHeight) {
      ref.scrollTo(pos.top + pos.height - viewportHeight);
    }
  }, [index]);

  return scrollRef;
}
