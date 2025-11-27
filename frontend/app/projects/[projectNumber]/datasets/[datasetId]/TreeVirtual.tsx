'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DatasetTreeNode } from '@/lib/types/dataset';
import { FixedSizeList as List } from 'react-window';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface TreeVirtualProps {
  datasetTree: DatasetTreeNode[];
  datasetId: number;
  projectNumber: number;
}

interface FlatTreeNode {
  id: number;
  name: string;
  comment?: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isCurrentDataset: boolean;
  parentId: number | string;
  originalNode: DatasetTreeNode;
}

export default function TreeVirtual({ datasetTree, datasetId, projectNumber }: TreeVirtualProps) {
  const router = useRouter();
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Transform flat tree data to hierarchical structure and flatten for virtualization
  const flattenedTree = useMemo(() => {
    const nodeMap = new Map<number, DatasetTreeNode[]>();
    const rootNodes: DatasetTreeNode[] = [];

    // Group nodes by parent
    datasetTree.forEach(node => {
      if (node.parent === "#") {
        rootNodes.push(node);
      } else {
        const parentId = typeof node.parent === 'string' ? parseInt(node.parent) : node.parent;
        if (!nodeMap.has(parentId)) {
          nodeMap.set(parentId, []);
        }
        nodeMap.get(parentId)?.push(node);
      }
    });

    // Flatten tree for virtual rendering
    const flattenNode = (node: DatasetTreeNode, level: number): FlatTreeNode[] => {
      const children = nodeMap.get(node.id) || [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedNodes.has(node.id);

      const flatNode: FlatTreeNode = {
        id: node.id,
        name: node.name,
        comment: node.comment,
        level,
        hasChildren,
        isExpanded,
        isCurrentDataset: node.id === datasetId,
        parentId: node.parent,
        originalNode: node
      };

      const result: FlatTreeNode[] = [flatNode];

      // Add children if expanded
      if (hasChildren && (isExpanded || level === 0)) {
        children.forEach(child => {
          result.push(...flattenNode(child, level + 1));
        });
      }

      return result;
    };

    const result: FlatTreeNode[] = [];
    rootNodes.forEach(root => {
      result.push(...flattenNode(root, 0));
    });

    return result;
  }, [datasetTree, datasetId, expandedNodes]);

  const toggleExpand = (nodeId: number) => {
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

  const TreeRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const node = flattenedTree[index];
    if (!node) return null;

    return (
      <div style={style} className="flex items-center">
        <div 
          className={`
            flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 w-full
            ${node.isCurrentDataset ? 'bg-blue-50 font-bold text-blue-600' : ''}
          `}
          style={{ paddingLeft: `${8 + node.level * 20}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (node.hasChildren) {
                toggleExpand(node.id);
              }
            }}
            className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
          >
            {node.hasChildren ? (
              node.isExpanded ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )
            ) : null}
          </button>

          {/* Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {node.hasChildren ? (
              node.isExpanded ? (
                <FolderOpen size={14} className="text-blue-500" />
              ) : (
                <Folder size={14} className="text-blue-500" />
              )
            ) : (
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            )}
          </div>

          {/* Node Content */}
          <div 
            className="flex-1 flex items-center gap-2"
            onClick={() => handleNodeClick(node.id)}
          >
            <span className={node.isCurrentDataset ? 'font-bold' : ''}>
              {node.name}
            </span>
            
            {node.comment && (
              <span className="text-xs text-gray-500">
                {node.comment}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!flattenedTree.length) {
    return <div className="text-gray-500 p-4">No tree data available</div>;
  }

  return (
    <div className="border rounded-lg bg-white">
      <List
        height={Math.min(250, flattenedTree.length * 32)}
        itemCount={flattenedTree.length}
        itemSize={32}
        width="100%"
      >
        {TreeRow}
      </List>
    </div>
  );
}