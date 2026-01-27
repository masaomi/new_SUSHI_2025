'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';

interface TreeNode {
  id: number;
  name: string;
  parent: number | '#';
  children?: TreeNode[];
}

interface ParentSelectorProps {
  treeNodes: any[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  searchQuery: string;
}

function ParentSelector({ treeNodes, selectedId, onSelect, searchQuery }: ParentSelectorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Transform flat data to hierarchical
  const roots = useMemo(() => {
    const nodeMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    treeNodes.forEach(node => {
      nodeMap.set(node.id, {
        id: node.id,
        name: node.dataset_data?.name || node.text || `Dataset ${node.id}`,
        parent: node.parent,
        children: [],
      });
    });

    treeNodes.forEach(node => {
      const treeNode = nodeMap.get(node.id);
      if (!treeNode) return;

      if (node.parent === '#') {
        rootNodes.push(treeNode);
      } else {
        const parent = nodeMap.get(Number(node.parent));
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(treeNode);
        }
      }
    });

    return rootNodes;
  }, [treeNodes]);

  // Filter nodes based on search
  const filteredRoots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roots;

    const filterNodes = (nodes: TreeNode[], parentMatches: boolean = false): TreeNode[] => {
      return nodes
        .map(node => {
          const selfMatch = node.name.toLowerCase().includes(q);
          const shouldInclude = parentMatches || selfMatch;

          // If this node or parent matches, include all children
          // Otherwise, filter children recursively
          const filteredChildren = shouldInclude
            ? node.children || []
            : filterNodes(node.children || [], false);

          if (shouldInclude || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean) as TreeNode[];
    };

    return filterNodes(roots);
  }, [roots, searchQuery]);

  // Expand all when searching
  useEffect(() => {
    if (searchQuery) {
      const allIds = new Set<number>();
      const collectIds = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          allIds.add(node.id);
          if (node.children) collectIds(node.children);
        });
      };
      collectIds(filteredRoots);
      setExpandedIds(allIds);
    }
  }, [searchQuery, filteredRoots]);

  const toggleExpand = (id: number) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id}>
        <div
          className="flex items-center py-1.5 px-2 hover:bg-gray-50 cursor-pointer"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => toggleExpand(node.id)}
        >
          {/* Expand/collapse icon */}
          <span className="w-4 h-4 flex items-center justify-center mr-1 text-gray-400 text-xs">
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </span>

          {/* Folder icon */}
          <svg className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>

          {/* Radio button - only this selects */}
          <button
            type="button"
            className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? 'border-blue-600 bg-blue-600'
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isSelected ? null : node.id);
            }}
          >
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          {/* Name and ID */}
          <span className="text-sm text-gray-700 truncate">{node.name}</span>
          <span className="text-xs text-gray-400 ml-1.5 flex-shrink-0">#{node.id}</span>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white max-h-56 overflow-y-auto">
      {filteredRoots.length === 0 ? (
        <div className="p-4 text-gray-500 text-sm text-center">No datasets found</div>
      ) : (
        <div className="py-1">
          {filteredRoots.map(node => renderNode(node))}
        </div>
      )}
    </div>
  );
}

export default function ImportDatasetPage() {
  const params = useParams<{ projectNumber: string }>();
  const router = useRouter();
  const projectNumber = Number(params.projectNumber);

  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [parentIdInput, setParentIdInput] = useState('');
  const [parentIdError, setParentIdError] = useState<string | null>(null);
  const [noParent, setNoParent] = useState(true);
  const [treeSearch, setTreeSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: treeData, isLoading: isTreeLoading } = useQuery({
    queryKey: ['datasets-tree', projectNumber],
    queryFn: () => projectApi.getProjectDatasetsTree(projectNumber),
    staleTime: 60_000,
  });

  // Build set of valid dataset IDs from tree
  const validIds = useMemo(() => {
    if (!treeData?.tree) return new Set<number>();
    return new Set(treeData.tree.map((node: any) => node.id));
  }, [treeData]);

  // Handle parent ID input change with validation
  const handleParentIdChange = (value: string) => {
    setParentIdInput(value);
    setParentIdError(null);

    if (!value.trim()) {
      setParentId(null);
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setParentIdError('Please enter a valid number');
      setParentId(null);
      return;
    }

    if (!validIds.has(numValue)) {
      setParentIdError(`Dataset #${numValue} not found`);
      setParentId(null);
      return;
    }

    setParentId(numValue);
  };

  // Handle selection from tree
  const handleTreeSelect = (id: number | null) => {
    setParentId(id);
    setParentIdInput(id?.toString() ?? '');
    setParentIdError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!datasetName) {
        const nameWithoutExtension = selectedFile.name.replace(/\.tsv$/i, '');
        setDatasetName(nameWithoutExtension);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select a dataset.tsv file');
      return;
    }

    if (!datasetName.trim()) {
      setError('Please enter a dataset name');
      return;
    }

    try {
      setIsSubmitting(true);
      await projectApi.importDataset(projectNumber, {
        file,
        name: datasetName.trim(),
        parentId: noParent ? null : parentId,
      });
      alert('Mock import successful!');
      router.push(`/projects/${projectNumber}/datasets`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Import Dataset</h1>
          <p className="text-gray-500 mt-1">
            Import a new dataset into project {projectNumber}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* File selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Dataset File
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  accept=".tsv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600">Click to select a <span className="font-medium">.tsv</span> file</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dataset name and Parent dataset side by side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Dataset name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Enter dataset name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Parent dataset ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Parent Dataset ID
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={noParent ? '' : parentIdInput}
                      onChange={(e) => handleParentIdChange(e.target.value)}
                      disabled={noParent}
                      placeholder="Enter ID or select below"
                      className={`w-full px-3 py-2 border rounded-lg text-sm transition-shadow ${
                        noParent
                          ? 'border-gray-200 bg-gray-50 text-gray-400'
                          : parentIdError
                            ? 'border-red-300 focus:ring-red-500 focus:ring-2 focus:outline-none'
                            : 'border-gray-300 focus:ring-blue-500 focus:ring-2 focus:outline-none'
                      }`}
                    />
                    {parentIdError && !noParent && (
                      <p className="text-xs text-red-500 mt-1">{parentIdError}</p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noParent}
                      onChange={(e) => {
                        setNoParent(e.target.checked);
                        if (e.target.checked) {
                          setParentId(null);
                          setParentIdInput('');
                          setParentIdError(null);
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 whitespace-nowrap">No parent</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tree selector */}
            {!noParent && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Parent Dataset
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    placeholder="Search datasets..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {isTreeLoading ? (
                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading datasets...</p>
                  </div>
                ) : treeData?.tree ? (
                  <ParentSelector
                    treeNodes={treeData.tree}
                    selectedId={parentId}
                    onSelect={handleTreeSelect}
                    searchQuery={treeSearch}
                  />
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 text-gray-500 text-sm text-center">
                    No datasets available
                  </div>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Importing...
                  </span>
                ) : (
                  'Import Dataset'
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
