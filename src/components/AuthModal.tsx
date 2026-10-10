import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { useSwipeToClose } from '../utils/swipe';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { AuthCard } from './auth/AuthCard';
import { themeConfig } from '@/design-system';

export { AuthCard } from './auth/AuthCard';

export const AuthModal: React.FC = () => {
  const { dir, isAuthModalOpen, setIsAuthModalOpen, user } = useAppContext();

  const swipeHandlers = useSwipeToClose({
    onSwipeClose: () => setIsAuthModalOpen(false),
    direction: 'both',
    dir: dir as 'rtl' | 'ltr',
    isMobile: true
  });

  useModalScrollLock(isAuthModalOpen, 'auth-modal');

  useEffect(() => {
    if (isAuthModalOpen && user) {
      setIsAuthModalOpen(false);
    }
  }, [isAuthModalOpen, user, setIsAuthModalOpen]);

  const handleClose = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className={themeConfig.auth.overlay}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
            className="relative z-10 w-full flex justify-center"
          >
            <AuthCard onClose={handleClose} showCloseButton={true} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

