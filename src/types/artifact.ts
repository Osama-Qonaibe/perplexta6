export type ProjectFileType =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'php'
  | 'sql'
  | 'json'
  | 'svg'
  | 'markdown'
  | 'other';

export interface ProjectFile {
  name: string;
  path: string; // e.g., "index.html", "css/style.css", "api/products.php", "db/schema.sql"
  content: string;
  type: ProjectFileType;
  isEntry?: boolean;
  isReadOnly?: boolean;
}

export type ProjectFiles = Record<string, ProjectFile>;

export function getFileTypeFromPath(filePath: string): ProjectFileType {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
    case 'jsx':
      return 'typescript';
    case 'php':
    case 'phtml':
      return 'php';
    case 'sql':
      return 'sql';
    case 'json':
      return 'json';
    case 'svg':
      return 'svg';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'other';
  }
}

export interface Artifact {
  id: string;
  title: string;
  type: 'code' | 'html' | 'svg' | 'markdown' | 'react' | 'chart' | 'data' | 'project' | 'image';
  language?: string;
  content: string;
  version: number;
  messageId?: string;
  description?: string;
  files?: ProjectFiles;
  activeFilePath?: string;
  openFileTabs?: string[];
  entryFilePath?: string;
  metadata?: {
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'radar';
    hasVisualChart?: boolean;
    dataset?: any[];
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  artifactId?: string;
  artifact?: Artifact;
}
