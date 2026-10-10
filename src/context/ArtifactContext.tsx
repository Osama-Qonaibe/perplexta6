import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Artifact, ProjectFiles, ProjectFile, getFileTypeFromPath } from '../types/artifact';
import { ensureArtifactFiles } from '../utils/artifactSandbox';

export type ArtifactTab = 'code' | 'preview' | 'analysis';
export type DeviceViewport = 'desktop' | 'tablet' | 'mobile';

export interface ConsoleLog {
  type: 'log' | 'info' | 'warn' | 'error';
  text: string;
  time: string;
}

export interface CanvasPanPosition {
  x: number;
  y: number;
}

interface CanvasStoredSession {
  activeArtifact: Artifact | null;
  isArtifactOpen: boolean;
  isFullscreen?: boolean;
  activeTab: ArtifactTab;
  deviceViewport: DeviceViewport;
  frameBg: 'auto' | 'light' | 'dark';
  zoom: number;
  pan: CanvasPanPosition;
  showFileTree?: boolean;
  lastModified: number;
}

interface ArtifactContextType {
  activeArtifact: Artifact | null;
  isArtifactOpen: boolean;
  isFullscreen: boolean;
  activeTab: ArtifactTab;
  deviceViewport: DeviceViewport;
  reloadKey: number;
  showConsole: boolean;
  logs: ConsoleLog[];
  frameBg: 'auto' | 'light' | 'dark';
  errorCount: number;
  zoom: number;
  pan: CanvasPanPosition;
  isPanning: boolean;
  isEditingCode: boolean;
  showCodeSearch: boolean;
  showFileTree: boolean;
  files: ProjectFiles;
  activeFilePath: string;
  openFileTabs: string[];
  entryFilePath: string;
  setActiveArtifact: (art: Artifact | null) => void;
  setIsArtifactOpen: (open: boolean) => void;
  setIsFullscreen: (full: boolean) => void;
  setActiveTab: (tab: ArtifactTab) => void;
  setDeviceViewport: (viewport: DeviceViewport) => void;
  triggerRefresh: () => void;
  setShowConsole: React.Dispatch<React.SetStateAction<boolean>>;
  setLogs: React.Dispatch<React.SetStateAction<ConsoleLog[]>>;
  setFrameBg: React.Dispatch<React.SetStateAction<'auto' | 'light' | 'dark'>>;
  setShowFileTree: React.Dispatch<React.SetStateAction<boolean>>;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomAtPoint: (clientX: number, clientY: number, newZoom: number, containerRect: DOMRect) => void;
  setPan: (pan: CanvasPanPosition | ((prev: CanvasPanPosition) => CanvasPanPosition)) => void;
  resetPan: () => void;
  resetTransform: () => void;
  setIsPanning: (panning: boolean) => void;
  setIsEditingCode: (editing: boolean) => void;
  setShowCodeSearch: (show: boolean) => void;
  updateArtifactContent: (newContent: string) => void;
  setActiveFile: (path: string) => void;
  openFileTab: (path: string) => void;
  closeFileTab: (path: string) => void;
  createFile: (path: string, content?: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  deleteFile: (path: string) => void;
  setEntryFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  closeArtifact: () => void;
}

const STORAGE_SESSION_KEY = 'perplexta_canvas_active_session';
const ARTIFACT_STATE_PREFIX = 'perplexta_canvas_state_';
const CANVAS_FULLSCREEN_HASH = 'canvas-fullscreen';

function checkHashForFullscreen(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith(CANVAS_FULLSCREEN_HASH) || hash === CANVAS_FULLSCREEN_HASH;
}

function parseHashParams(): { tab?: ArtifactTab; viewport?: DeviceViewport } {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.includes('?') && !hash.includes('&')) return {};

  const queryPart = hash.includes('?') ? hash.split('?')[1] : hash.split('&').slice(1).join('&');
  const params = new URLSearchParams(queryPart);

  const tab = params.get('tab');
  const viewport = params.get('viewport');

  const validTabs: ArtifactTab[] = ['code', 'preview', 'analysis'];
  const validViewports: DeviceViewport[] = ['desktop', 'tablet', 'mobile'];

  return {
    tab: validTabs.includes(tab as ArtifactTab) ? (tab as ArtifactTab) : undefined,
    viewport: validViewports.includes(viewport as DeviceViewport) ? (viewport as DeviceViewport) : undefined
  };
}

function syncFullscreenToHash(isFullscreenActive: boolean) {
  if (typeof window === 'undefined') return;
  const currentHash = window.location.hash.replace(/^#/, '');
  const hasFullscreenInHash = currentHash.startsWith(CANVAS_FULLSCREEN_HASH);

  if (isFullscreenActive && !hasFullscreenInHash) {
    const newHash = `#${CANVAS_FULLSCREEN_HASH}`;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${newHash}`);
    } else {
      window.location.hash = CANVAS_FULLSCREEN_HASH;
    }
  } else if (!isFullscreenActive && hasFullscreenInHash) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    } else {
      window.location.hash = '';
    }
  }
}

export const ArtifactContext = createContext<ArtifactContextType | undefined>(undefined);

export function ArtifactProvider({ children }: { children: React.ReactNode }) {
  // Safe initial hydration from localStorage
  const getInitialState = (): Partial<CanvasStoredSession> => {
    try {
      if (typeof window === 'undefined') return {};
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const initial = getInitialState();
  const hashHasFullscreen = checkHashForFullscreen();
  const hashParams = parseHashParams();

  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(initial.activeArtifact || null);
  const [isArtifactOpen, setIsArtifactOpen] = useState<boolean>(
    hashHasFullscreen ? true : (initial.isArtifactOpen ?? !!initial.activeArtifact)
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    hashHasFullscreen || Boolean(initial.isFullscreen)
  );
  const [activeTab, setActiveTab] = useState<ArtifactTab>(hashParams.tab || initial.activeTab || 'preview');
  const [deviceViewport, setDeviceViewport] = useState<DeviceViewport>(hashParams.viewport || initial.deviceViewport || 'desktop');
  const [reloadKey, setReloadKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [frameBg, setFrameBg] = useState<'auto' | 'light' | 'dark'>(initial.frameBg || 'auto');
  const [zoom, setZoomState] = useState<number>(typeof initial.zoom === 'number' ? initial.zoom : 1.0);
  const [pan, setPanState] = useState<CanvasPanPosition>(initial.pan || { x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [showCodeSearch, setShowCodeSearch] = useState(false);
  const [showFileTree, setShowFileTree] = useState<boolean>(initial.showFileTree ?? true);

  // Multi-file project state initialized from active artifact
  const initialFilesData = activeArtifact ? ensureArtifactFiles(activeArtifact) : { files: {}, entryPath: 'index.html', activePath: 'index.html' };
  const [files, setFiles] = useState<ProjectFiles>(initialFilesData.files);
  const [activeFilePath, setActiveFilePath] = useState<string>(activeArtifact?.activeFilePath || initialFilesData.activePath);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>(
    activeArtifact?.openFileTabs && activeArtifact.openFileTabs.length > 0
      ? activeArtifact.openFileTabs
      : Object.keys(initialFilesData.files).slice(0, 4)
  );
  const [entryFilePath, setEntryFilePath] = useState<string>(activeArtifact?.entryFilePath || initialFilesData.entryPath);

  // Re-sync multi-file state when activeArtifact ID changes
  const prevArtifactIdRef = useRef<string | null>(activeArtifact?.id || null);
  useEffect(() => {
    if (activeArtifact && activeArtifact.id !== prevArtifactIdRef.current) {
      prevArtifactIdRef.current = activeArtifact.id;
      const normalized = ensureArtifactFiles(activeArtifact);
      setFiles(normalized.files);
      const newEntry = activeArtifact.entryFilePath || normalized.entryPath;
      const newActive = activeArtifact.activeFilePath || normalized.activePath;
      setEntryFilePath(newEntry);
      setActiveFilePath(newActive);
      setOpenFileTabs(
        activeArtifact.openFileTabs && activeArtifact.openFileTabs.length > 0
          ? activeArtifact.openFileTabs
          : Object.keys(normalized.files).slice(0, 4)
      );
    }
  }, [activeArtifact]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const errorCount = logs.filter(l => l.type === 'error').length;

  // Multi-file actions
  const setActiveFile = useCallback((path: string) => {
    setActiveFilePath(path);
    setOpenFileTabs(prev => prev.includes(path) ? prev : [...prev, path]);
    setActiveArtifact(prev => {
      if (!prev) return null;
      return {
        ...prev,
        activeFilePath: path,
        content: prev.files && prev.files[path] ? prev.files[path].content : prev.content
      };
    });
  }, []);

  const openFileTab = useCallback((path: string) => {
    setActiveFile(path);
  }, [setActiveFile]);

  const closeFileTab = useCallback((path: string) => {
    setOpenFileTabs(prev => {
      const nextTabs = prev.filter(p => p !== path);
      if (activeFilePath === path && nextTabs.length > 0) {
        setActiveFilePath(nextTabs[nextTabs.length - 1]);
      }
      return nextTabs;
    });
  }, [activeFilePath]);

  const createFile = useCallback((filePath: string, initialContent: string = '') => {
    const cleanPath = filePath.trim().replace(/^\/+/, '');
    if (!cleanPath) return;

    const fileName = cleanPath.split('/').pop() || cleanPath;
    const fileType = getFileTypeFromPath(cleanPath);

    const newFile: ProjectFile = {
      name: fileName,
      path: cleanPath,
      content: initialContent,
      type: fileType,
      isEntry: Object.keys(files).length === 0
    };

    setFiles(prev => {
      const updated = { ...prev, [cleanPath]: newFile };
      setActiveArtifact(art => art ? { ...art, files: updated } : null);
      return updated;
    });

    setOpenFileTabs(prev => prev.includes(cleanPath) ? prev : [...prev, cleanPath]);
    setActiveFilePath(cleanPath);
  }, [files]);

  const renameFile = useCallback((oldPath: string, newPath: string) => {
    const cleanNew = newPath.trim().replace(/^\/+/, '');
    if (!cleanNew || oldPath === cleanNew) return;

    setFiles(prev => {
      if (!prev[oldPath]) return prev;
      const file = prev[oldPath];
      const fileName = cleanNew.split('/').pop() || cleanNew;
      const fileType = getFileTypeFromPath(cleanNew);

      const updated = { ...prev };
      delete updated[oldPath];
      updated[cleanNew] = {
        ...file,
        name: fileName,
        path: cleanNew,
        type: fileType
      };

      setActiveArtifact(art => art ? { ...art, files: updated } : null);
      return updated;
    });

    setOpenFileTabs(prev => prev.map(p => p === oldPath ? cleanNew : p));
    if (activeFilePath === oldPath) setActiveFilePath(cleanNew);
    if (entryFilePath === oldPath) setEntryFilePath(cleanNew);
  }, [activeFilePath, entryFilePath]);

  const deleteFile = useCallback((path: string) => {
    setFiles(prev => {
      const updated = { ...prev };
      delete updated[path];
      setActiveArtifact(art => art ? { ...art, files: updated } : null);
      return updated;
    });

    closeFileTab(path);

    // If entry was deleted, reassign to first html/php file
    if (entryFilePath === path) {
      const remaining = Object.keys(files).filter(k => k !== path);
      const nextEntry = remaining.find(k => k.endsWith('.html')) || remaining[0] || 'index.html';
      setEntryFilePath(nextEntry);
    }
  }, [closeFileTab, entryFilePath, files]);

  const setEntryFile = useCallback((path: string) => {
    setEntryFilePath(path);
    setFiles(prev => {
      const updated: ProjectFiles = {};
      for (const [k, f] of Object.entries(prev)) {
        updated[k] = { ...f, isEntry: k === path };
      }
      setActiveArtifact(art => art ? { ...art, files: updated, entryFilePath: path } : null);
      return updated;
    });
  }, []);

  const updateFileContent = useCallback((path: string, newContent: string) => {
    setFiles(prev => {
      if (!prev[path]) return prev;
      const updated = {
        ...prev,
        [path]: { ...prev[path], content: newContent }
      };

      setActiveArtifact(art => {
        if (!art) return null;
        return {
          ...art,
          files: updated,
          content: (path === activeFilePath || path === entryFilePath) ? newContent : art.content,
          version: (art.version || 1) + 1
        };
      });

      return updated;
    });
  }, [activeFilePath, entryFilePath]);

  // Zoom Helpers with expanded precision range (10% to 500%)
  const setZoom = useCallback((updater: number | ((prev: number) => number)) => {
    setZoomState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return Math.min(Math.max(Number(next.toFixed(2)), 0.1), 5.0);
    });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(z => {
      if (z < 1.0) return Number(Math.min(5.0, z + 0.1).toFixed(2));
      if (z < 2.0) return Number(Math.min(5.0, z + 0.25).toFixed(2));
      return Number(Math.min(5.0, z + 0.5).toFixed(2));
    });
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(z => {
      if (z <= 1.0) return Number(Math.max(0.1, z - 0.1).toFixed(2));
      if (z <= 2.0) return Number(Math.max(0.1, z - 0.25).toFixed(2));
      return Number(Math.max(0.1, z - 0.5).toFixed(2));
    });
  }, [setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
  }, [setZoom]);

  // Focal-point zoom ensuring pixel under mouse coordinates remains anchored without drift
  const zoomAtPoint = useCallback((clientX: number, clientY: number, newZoom: number, containerRect: DOMRect) => {
    const clampedZoom = Math.min(Math.max(Number(newZoom.toFixed(2)), 0.1), 5.0);
    setZoomState(currentZoom => {
      if (currentZoom === clampedZoom) return currentZoom;
      const centerX = containerRect.left + containerRect.width / 2;
      const centerY = containerRect.top + containerRect.height / 2;
      const xRel = clientX - centerX;
      const yRel = clientY - centerY;
      
      const scaleRatio = clampedZoom / currentZoom;
      setPanState(currentPan => ({
        x: Math.round(currentPan.x * scaleRatio + xRel * (1 - scaleRatio)),
        y: Math.round(currentPan.y * scaleRatio + yRel * (1 - scaleRatio))
      }));

      return clampedZoom;
    });
  }, []);

  // Pan Helpers
  const setPan = useCallback((updater: CanvasPanPosition | ((prev: CanvasPanPosition) => CanvasPanPosition)) => {
    setPanState(prev => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, [setPan]);

  const resetTransform = useCallback(() => {
    resetZoom();
    resetPan();
  }, [resetZoom, resetPan]);

  // Trigger preview reload
  const triggerRefresh = useCallback(() => {
    setLogs([]);
    setReloadKey(k => k + 1);
  }, []);

  // Update content of active artifact and persist
  const updateArtifactContent = useCallback((newContent: string) => {
    setActiveArtifact(prev => {
      if (!prev) return null;
      const updatedFiles = prev.files ? {
        ...prev.files,
        [activeFilePath]: {
          ...(prev.files[activeFilePath] || {
            name: activeFilePath.split('/').pop() || activeFilePath,
            path: activeFilePath,
            type: getFileTypeFromPath(activeFilePath)
          }),
          content: newContent
        }
      } : undefined;

      const updated = {
        ...prev,
        content: newContent,
        files: updatedFiles,
        version: (prev.version || 1) + 1,
      };

      if (updatedFiles) {
        setFiles(updatedFiles);
      }

      // Also persist to individual artifact storage
      try {
        const itemKey = `${ARTIFACT_STATE_PREFIX}${updated.id || 'current'}`;
        localStorage.setItem(itemKey, JSON.stringify({
          artifactId: updated.id,
          content: newContent,
          lastModified: Date.now()
        }));
      } catch {}

      return updated;
    });
  }, [activeFilePath]);

  // Sync isFullscreen state with URL hash
  useEffect(() => {
    syncFullscreenToHash(isFullscreen);
  }, [isFullscreen]);

  // Listen for browser navigation / hashchange events for deep-linking into Canvas
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const isHashFullscreen = checkHashForFullscreen();
      setIsFullscreen(isHashFullscreen);
      if (isHashFullscreen) {
        setIsArtifactOpen(true);
        const params = parseHashParams();
        if (params.tab) setActiveTab(params.tab);
        if (params.viewport) setDeviceViewport(params.viewport);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Persist session state to localStorage on state changes
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      try {
        if (typeof window === 'undefined') return;
        const sessionData: CanvasStoredSession = {
          activeArtifact,
          isArtifactOpen,
          isFullscreen,
          activeTab,
          deviceViewport,
          frameBg,
          zoom,
          pan,
          lastModified: Date.now()
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));

        if (activeArtifact?.id) {
          const itemKey = `${ARTIFACT_STATE_PREFIX}${activeArtifact.id}`;
          localStorage.setItem(itemKey, JSON.stringify({
            artifactId: activeArtifact.id,
            content: activeArtifact.content,
            zoom,
            pan,
            activeTab,
            deviceViewport,
            frameBg,
            lastModified: Date.now()
          }));
        }
      } catch (e) {
        console.warn('[ArtifactContext] Storage save failed:', e);
      }
    }, 250);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeArtifact, isArtifactOpen, isFullscreen, activeTab, deviceViewport, frameBg, zoom, pan]);

  // Close artifact and clean active session immediately without delay or lingering transitions
  const closeArtifact = useCallback(() => {
    setIsArtifactOpen(false);
    setIsFullscreen(false);
    syncFullscreenToHash(false);
    setActiveArtifact(null);
    setDeviceViewport('desktop');
    setShowConsole(false);
    setLogs([]);
    resetTransform();
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {}
  }, [resetTransform]);

  return (
    <ArtifactContext.Provider
      value={{
        activeArtifact,
        isArtifactOpen,
        isFullscreen,
        activeTab,
        deviceViewport,
        reloadKey,
        showConsole,
        logs,
        frameBg,
        errorCount,
        zoom,
        pan,
        isPanning,
        isEditingCode,
        showCodeSearch,
        showFileTree,
        files,
        activeFilePath,
        openFileTabs,
        entryFilePath,
        setActiveArtifact,
        setIsArtifactOpen,
        setIsFullscreen,
        setActiveTab,
        setDeviceViewport,
        triggerRefresh,
        setShowConsole,
        setLogs,
        setFrameBg,
        setShowFileTree,
        setZoom,
        zoomIn,
        zoomOut,
        resetZoom,
        zoomAtPoint,
        setPan,
        resetPan,
        resetTransform,
        setIsPanning,
        setIsEditingCode,
        setShowCodeSearch,
        updateArtifactContent,
        setActiveFile,
        openFileTab,
        closeFileTab,
        createFile,
        renameFile,
        deleteFile,
        setEntryFile,
        updateFileContent,
        closeArtifact,
      }}
    >
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifact must be used within ArtifactProvider');
  }
  return context;
}
