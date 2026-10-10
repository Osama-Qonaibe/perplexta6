import React from 'react';
import { useArtifact } from '../../../context/ArtifactContext';
import { useAppContext } from '../../../context/AppContext';
import {
  FileCode,
  FileText,
  FileJson,
  X,
  Plus,
  PanelLeft,
  PanelLeftClose,
  Star
} from 'lucide-react';

export function CanvasTabBar() {
  const {
    openFileTabs,
    activeFilePath,
    entryFilePath,
    files,
    setActiveFile,
    closeFileTab,
    createFile,
    showFileTree,
    setShowFileTree
  } = useArtifact();
  const { language, dir } = useAppContext();
  const isAr = language === 'ar' || dir === 'rtl';

  const getFileIcon = (path: string) => {
    if (path.endsWith('.json')) return <FileJson size={13} className="text-amber-400 shrink-0" />;
    if (path.endsWith('.css')) return <FileText size={13} className="text-sky-400 shrink-0" />;
    if (path.endsWith('.html') || path.endsWith('.htm')) return <FileCode size={13} className="text-orange-400 shrink-0" />;
    if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.jsx')) {
      return <FileCode size={13} className="text-yellow-400 shrink-0" />;
    }
    return <FileText size={13} className="text-[var(--text-muted)] shrink-0" />;
  };

  const handleAddNew = () => {
    const nextIndex = Object.keys(files).length + 1;
    const defaultName = `script_${nextIndex}.js`;
    createFile(defaultName, `// ${defaultName}\nconsole.log('Running ${defaultName}');\n`);
  };

  return (
    <div className="flex items-center justify-between h-9 border-b border-[var(--border-default)] bg-[var(--surface-subtle)] px-2 select-none overflow-x-auto custom-scrollbar shrink-0">
      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setShowFileTree(prev => !prev)}
          className={`h-7 px-2 rounded-shape-xs flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 ${
            showFileTree
              ? 'bg-[var(--surface-card)] text-[var(--fg-accent)] border border-[var(--border-default)] shadow-2xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]'
          }`}
          title={isAr ? 'شجرة الملفات' : 'File Explorer'}
        >
          {showFileTree ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
          <span className="hidden sm:inline text-[11px] font-semibold">{isAr ? 'الملفات' : 'Files'}</span>
        </button>

        <div className="w-px h-4 bg-[var(--border-default)] mx-1 shrink-0" />

        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto py-0.5">
          {openFileTabs.map(tabPath => {
            const isActive = tabPath === activeFilePath;
            const isEntry = tabPath === entryFilePath;
            const fileName = tabPath.split('/').pop() || tabPath;

            return (
              <div
                key={tabPath}
                onClick={() => setActiveFile(tabPath)}
                className={`group flex items-center gap-1.5 h-7 px-2.5 rounded-shape-xs text-xs font-mono transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-[var(--surface-card)] text-[var(--fg-accent)] border-[var(--border-accent)] shadow-2xs font-bold'
                    : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] border-transparent'
                }`}
                title={tabPath}
              >
                {getFileIcon(tabPath)}
                <span className="truncate max-w-[130px] text-[11px]">{fileName}</span>

                {isEntry && (
                  <span title={isAr ? 'نقطة البدء للمعاينة' : 'Entry Point'} className="flex items-center shrink-0">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                  </span>
                )}

                {openFileTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFileTab(tabPath);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-[var(--surface-subtle)] rounded-shape-xs p-0.5 transition-opacity"
                    title={isAr ? 'إغلاق التبويب' : 'Close Tab'}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddNew}
            className="w-6 h-6 rounded-shape-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
            title={isAr ? 'إضافة ملف جديد' : 'New File'}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
