import { useEffect } from 'react';

let lockCount = 0;

let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalContainerOverflowY = '';

export function useModalScrollLock(isOpen: boolean, modalKey = 'modal') {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const scrollContainer = document.querySelector(
      '.main-scroll-container'
    ) as HTMLElement | null;

    if (lockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalContainerOverflowY = scrollContainer?.style.overflowY || '';

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      if (scrollContainer) {
        scrollContainer.style.setProperty('overflow-y', 'hidden', 'important');
      }
    }

    lockCount += 1;
    document.body.classList.add(`${modalKey}-active`);

    return () => {
      document.body.classList.remove(`${modalKey}-active`);

      lockCount = Math.max(0, lockCount - 1);

      if (lockCount > 0) return;

      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;

      if (scrollContainer) {
        if (originalContainerOverflowY) {
          scrollContainer.style.overflowY = originalContainerOverflowY;
        } else {
          scrollContainer.style.removeProperty('overflow-y');
        }
      }
    };
  }, [isOpen, modalKey]);
}


