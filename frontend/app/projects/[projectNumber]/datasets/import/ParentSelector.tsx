'use client';

import { useState, useEffect, useMemo } from 'react';

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

export default function ParentSelector({ treeNodes, selectedId, onSelect, searchQuery }: ParentSelectorProps) {
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
          className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => onSelect(isSelected ? null : node.id)}
        >
          {/* Expand/collapse icon */}
          <span
            className={`w-4 h-4 flex items-center justify-center mr-1 text-gray-400 text-xs ${hasChildren ? 'cursor-pointer hover:text-gray-600' : ''}`}
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation();
                toggleExpand(node.id);
              }
            }}
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </span>

          {/* Folder icon */}
          <svg className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>

          {/* Radio button indicator */}
          <div
            className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? 'border-blue-600 bg-blue-600'
                : 'border-gray-300'
            }`}
          >
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>

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
