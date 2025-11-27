'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DatasetTreeNode } from '@/lib/types/dataset';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface TreeCustomProps {
  datasetTree: DatasetTreeNode[];
  datasetId: number;
  projectNumber: number;
}

interface TreeNode {
  id: number;
  name: string;
  comment?: string;
  children: TreeNode[];
  isCurrentDataset: boolean;
  parent: number | string;
}

export default function TreeCustom({ datasetTree, datasetId, projectNumber }: TreeCustomProps) {
  const router = useRouter();
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Transform flat tree data to hierarchical structure
  const buildTreeStructure = (flatData: DatasetTreeNode[]): TreeNode[] => {
    const nodeMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // First pass: Create all nodes
    flatData.forEach(node => {
      const treeNode: TreeNode = {
        id: node.id,
        name: node.name,
        comment: node.comment,
        children: [],
        isCurrentDataset: node.id === datasetId,
        parent: node.parent
      };
      nodeMap.set(node.id, treeNode);
    });

    // Second pass: Build hierarchy
    flatData.forEach(node => {
      const treeNode = nodeMap.get(node.id);
      if (!treeNode) return;

      if (node.parent === "#") {
        rootNodes.push(treeNode);
      } else {
        const parentId = typeof node.parent === 'string' ? parseInt(node.parent) : node.parent;
        const parent = nodeMap.get(parentId);
        if (parent) {
          parent.children.push(treeNode);
        }
      }
    });

    return rootNodes;
  };

  const treeStructure = buildTreeStructure(datasetTree);

  const toggleExpand = (nodeId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleNodeClick = (nodeId: number) => {
    if (nodeId !== datasetId) {
      router.push(`/projects/${projectNumber}/datasets/${nodeId}`);
    }
  };

  const TreeNodeComponent = ({ 
    node, 
    level = 0 
  }: { 
    node: TreeNode; 
    level?: number; 
  }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || level === 0; // Root nodes expanded by default
    const paddingLeft = level * 20 + 8;

    return (
      <div className="select-none">
        {/* Node Row */}
        <div 
          className={`
            flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors
            ${node.isCurrentDataset ? 'bg-blue-50 font-bold text-blue-600' : ''}
          `}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => handleNodeClick(node.id)}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => hasChildren ? toggleExpand(node.id, e) : undefined}
            className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )
            ) : null}
          </button>

          {/* Folder Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen size={14} className="text-blue-500" />
              ) : (
                <Folder size={14} className="text-blue-500" />
              )
            ) : (
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            )}
          </div>

          {/* Node Name */}
          <span className={`flex-1 ${node.isCurrentDataset ? 'font-bold' : ''}`}>
            {node.name}
          </span>

          {/* Comment */}
          {node.comment && (
            <span className="text-xs text-gray-500 ml-2 italic">
              {node.comment}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 ml-4">
            {node.children.map(child => (
              <TreeNodeComponent 
                key={child.id} 
                node={child} 
                level={level + 1} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!treeStructure.length) {
    return (
      <div className="text-gray-500 p-4 border rounded-lg bg-gray-50">
        No tree data available
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="max-h-64 overflow-y-auto">
        {treeStructure.map(node => (
          <TreeNodeComponent key={node.id} node={node} level={0} />
        ))}
      </div>
    </div>
  );
}