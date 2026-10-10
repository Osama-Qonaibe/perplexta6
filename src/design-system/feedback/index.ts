/**
 * 📣 PERPLEXTA DESIGN SYSTEM — FEEDBACK BARREL EXPORT
 */

import React from 'react';
import { NotificationProvider } from './NotificationEngine';
import { ConfirmProvider } from './ConfirmEngine';

export const UnifiedFeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(
    NotificationProvider,
    null,
    React.createElement(ConfirmProvider, null, children)
  );
};

export * from './NotificationEngine';
export * from './ConfirmEngine';
