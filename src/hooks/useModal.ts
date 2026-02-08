import { useCallback, useState } from 'react';

/**
 * Generic modal state management hook.
 *
 * @template T - Union type of modal types (e.g., 'configure' | 'link' | 'status')
 */
export function useModal<T extends string>() {
  const [modalType, setModalType] = useState<T | 'none'>('none');

  const open = useCallback((type: T) => setModalType(type), []);
  const close = useCallback(() => setModalType('none'), []);

  const isOpen = modalType !== 'none';

  return {
    type: modalType,
    isOpen,
    open,
    close,
  };
}
