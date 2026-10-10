import React from 'react';
import { FileText, Image as ImageIcon, Video, Music, FileCode, FileDown } from 'lucide-react';

export const getFileIcon = (type: string) => {
  if (type.includes('image')) return React.createElement(ImageIcon, { size: 18 });
  if (type.includes('video')) return React.createElement(Video, { size: 18 });
  if (type.includes('audio')) return React.createElement(Music, { size: 18 });
  if (type.includes('pdf')) return React.createElement(FileText, { size: 18 });
  if (type.includes('javascript') || type.includes('typescript') || type.includes('html') || type.includes('css') || type.includes('json')) return React.createElement(FileCode, { size: 18 });
  return React.createElement(FileDown, { size: 18 });
};
