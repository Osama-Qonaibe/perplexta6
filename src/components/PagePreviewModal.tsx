import React from 'react';
import { X } from 'lucide-react';

interface PagePreviewModalProps {
  url: string;
  onClose: () => void;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 py-12 md:py-16">
      <div className="bg-[var(--surface-card)] text-[var(--text-primary)] w-full max-w-sm h-[80vh] rounded-[var(--radius-lg)] overflow-hidden flex flex-col shadow-2xl border border-[var(--border-default)]">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border-default)] bg-[var(--surface-subtle)]">
          <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] truncate">{url}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="w-7 h-7 min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 w-full bg-[var(--surface-page)]">
          <iframe 
            src={url} 
            className="w-full h-full border-0"
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
};
