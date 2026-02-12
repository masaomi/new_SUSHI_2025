import { DirectoryContents, FileItem } from '../types/files';

// Mock file system structure
const mockFileSystem: Record<string, FileItem[]> = {
  // Root level
  '': [
    { name: 'p1001', type: 'folder', lastModified: '2026-01-27 10:30:00', size: null },
    { name: 'p2220', type: 'folder', lastModified: '2026-01-26 14:15:00', size: null },
  ],
  // Project p1001
  'p1001': [
    { name: 'FastQC_2026-01-15', type: 'folder', lastModified: '2026-01-15 09:30:00', size: null },
    { name: 'RNAseq_Results_2026-01-20', type: 'folder', lastModified: '2026-01-20 14:45:00', size: null },
    { name: 'README.txt', type: 'file', lastModified: '2026-01-10 08:00:00', size: 1240 },
  ],
  // FastQC folder
  'p1001/FastQC_2026-01-15': [
    { name: 'sample1_fastqc.html', type: 'file', lastModified: '2026-01-15 09:32:00', size: 245780 },
    { name: 'sample2_fastqc.html', type: 'file', lastModified: '2026-01-15 09:33:00', size: 251200 },
    { name: 'multiqc_report.html', type: 'file', lastModified: '2026-01-15 09:35:00', size: 1048576 },
  ],
  // RNAseq folder
  'p1001/RNAseq_Results_2026-01-20': [
    { name: 'counts.tsv', type: 'file', lastModified: '2026-01-20 14:30:00', size: 524288 },
    { name: 'differential_expression.xlsx', type: 'file', lastModified: '2026-01-20 14:40:00', size: 89500 },
    { name: 'analysis', type: 'folder', lastModified: '2026-01-20 14:45:00', size: null },
  ],
  // Analysis subfolder (2 levels deep)
  'p1001/RNAseq_Results_2026-01-20/analysis': [
    { name: 'volcano_plot.png', type: 'file', lastModified: '2026-01-20 14:42:00', size: 156000 },
    { name: 'heatmap.png', type: 'file', lastModified: '2026-01-20 14:43:00', size: 234000 },
  ],
  // Project p2220 (minimal)
  'p2220': [
    { name: 'DataSteward_UZH', type: 'folder', lastModified: '2026-01-27 09:15:14', size: null },
    { name: 'HumanCtrl_Fastqc_2026-01-26', type: 'folder', lastModified: '2026-01-26 14:15:33', size: null },
  ],
};

export const filesApi = {
  async getDirectoryContents(path: string): Promise<DirectoryContents> {
    // Normalize path (remove leading/trailing slashes)
    const normalizedPath = path.replace(/^\/+|\/+$/g, '');

    // Get items for this path
    const items = mockFileSystem[normalizedPath];

    if (!items) {
      return Promise.reject(new Error(`Path not found: ${path}`));
    }

    // Sort by name (folders first, then files)
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    // Calculate parent path
    const pathParts = normalizedPath.split('/').filter(Boolean);
    const parentPath = pathParts.length > 0
      ? pathParts.slice(0, -1).join('/') || null
      : null;

    return Promise.resolve({
      currentPath: normalizedPath || '/',
      parentPath,
      totalItems: sortedItems.length,
      items: sortedItems,
    });
  },

  getDownloadUrl(path: string): string {
    // In real implementation, this would return a presigned URL or trigger download
    return `/api/files/download?path=${encodeURIComponent(path)}`;
  },
};
