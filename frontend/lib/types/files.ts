export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  lastModified: string;
  size: number | null; // null for folders
}

export interface DirectoryContents {
  currentPath: string;
  parentPath: string | null;
  totalItems: number;
  items: FileItem[];
}
