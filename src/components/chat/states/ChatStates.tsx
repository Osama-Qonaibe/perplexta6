import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface ChatLoadingProps {
  dir: 'rtl' | 'ltr';
  message?: string;
}

export const ChatLoadingState: React.FC<ChatLoadingProps> = ({ dir, message }) => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] py-12">
    <div className="relative w-10 h-10 mb-3.5 flex items-center justify-center">
      <div className="absolute inset-0 border-2 border-[var(--border-default)] rounded-full" />
      <Loader2 size={36} className="text-[var(--fg-accent)] animate-spin" />
    </div>
    <p className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
      {message || (dir === 'rtl' ? 'جاري تحميل المحتوى...' : 'Loading Content...')}
    </p>
  </div>
);

interface ChatErrorProps {
  dir: 'rtl' | 'ltr';
  error: string;
  onRetry?: () => void;
}

export const ChatErrorState: React.FC<ChatErrorProps> = ({ dir, error, onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
    <div className="w-12 h-12 rounded-shape-md bg-[var(--status-danger-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--fg-danger)] mb-4">
      <AlertCircle size={24} />
    </div>
    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
      {dir === 'rtl' ? 'تعذر إكمال العملية' : 'Operation Incomplete'}
    </h3>
    <p className="text-xs text-[var(--text-secondary)] font-normal leading-relaxed mb-6">
      {error}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 min-h-[44px] bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] rounded-shape-sm text-xs font-bold hover:opacity-90 transition-theme active:scale-95 shadow-xs cursor-pointer"
      >
        {dir === 'rtl' ? 'إعادة المحاولة' : 'Retry'}
      </button>
    )}
  </div>
);

