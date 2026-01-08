'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tree } from 'react-arborist';
import type { TreeNode } from '@/lib/api';

interface DatasetTreeProps {
  treeNodes: TreeNode[];
  selectedIds: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  projectNumber: number;
  searchQuery?: string;
}

interface TreeNodeData {
  id: string;
  name: string;
  comment?: string;
  children?: TreeNodeData[];
  href: string;
  visible: boolean;
  originalId: number;
}

export default function DatasetTree({
  treeNodes,
  selectedIds,
  onSelectionChange,
  projectNumber,
  searchQuery = ''
}: DatasetTreeProps) {
  const [roots, setRoots] = useState<TreeNodeData[]>([]);

  // Transform flat tree data to hierarchical structure
  const transformTreeData = (flatData: TreeNode[]): TreeNodeData[] => {
    const nodeMap = new Map<string, TreeNodeData>();
    const rootNodes: TreeNodeData[] = [];

    // First pass: Create all nodes
    flatData.forEach(node => {
      const treeNode: TreeNodeData = {
        id: node.id.toString(),
        name: node.dataset_data.name,
        comment: node.dataset_data.comment,
        children: [],
        href: node.a_attr.href,
        visible: true,
        originalId: node.id
      };
      nodeMap.set(node.id.toString(), treeNode);
    });

    // Second pass: Build hierarchy
    flatData.forEach(node => {
      const treeNode = nodeMap.get(node.id.toString());
      if (!treeNode) return;

      if (node.parent === "#") {
        rootNodes.push(treeNode);
      } else {
        const parent = nodeMap.get(node.parent.toString());
        if (parent && parent.children) {
          parent.children.push(treeNode);
        }
      }
    });

    return rootNodes;
  };

  useEffect(() => {
    const transformed = transformTreeData(treeNodes);
    setRoots(transformed);
  }, [treeNodes]);

  // Filter tree data based on search query
  const filteredRoots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roots;

    const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        const filteredChildren = filterNodes(node.children || []);
        const selfMatch = node.name.toLowerCase().includes(q);
        
        if (selfMatch || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
            visible: true
          };
        }
        return null;
      }).filter(Boolean) as TreeNodeData[];
    };

    return filterNodes(roots);
  }, [roots, searchQuery]);


  const toggleSelected = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const Node = ({ node, style, dragHandle, tree }: any) => {
    const isExpanded = node.isOpen;
    const hasChildren = node.children && node.children.length > 0;
    const level = node.level;
    const isSelected = selectedIds.has(node.data.originalId);

    const handleExpandToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        node.toggle();
      }
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleSelected(node.data.originalId);
    };

    return (
      <div
        ref={dragHandle}
        style={{
          ...style,
          paddingLeft: `${level * 18 + 8}px`,
        }}
        className="relative flex items-center py-1 hover:bg-gray-50 cursor-pointer select-none"
      >
        {/* Connection lines */}
        {level > 0 && (
          <>
            {/* Vertical line from parent */}
            <div 
              className="absolute border-l border-dotted border-gray-300"
              style={{
                left: `${(level - 1) * 18 + 18}px`,
                top: 0,
                bottom: hasChildren && isExpanded ? '50%' : 0,
                width: '1px'
              }}
            />
            {/* Horizontal line to node */}
            <div 
              className="absolute border-t border-dotted border-gray-300"
              style={{
                left: `${(level - 1) * 18 + 18}px`,
                top: '50%',
                width: '8px',
                height: '1px'
              }}
            />
          </>
        )}

        {/* Expand/Collapse Icon */}
        <div 
          className="w-4 h-4 flex items-center justify-center cursor-pointer mr-1 relative z-10"
          onClick={handleExpandToggle}
        >
          {hasChildren ? (
            <div className="w-2 h-2 border border-gray-400 bg-white flex items-center justify-center text-xs leading-none">
              {isExpanded ? '−' : '+'}
            </div>
          ) : null}
        </div>

        {/* Folder Icon */}
        <div className="w-4 h-4 flex items-center justify-center mr-1">
          <div className="w-3 h-3 bg-yellow-400 border border-yellow-600" style={{
            clipPath: hasChildren && isExpanded 
              ? 'polygon(0% 20%, 20% 0%, 100% 0%, 100% 80%, 80% 100%, 0% 100%)'
              : 'polygon(0% 30%, 30% 0%, 100% 0%, 100% 70%, 70% 100%, 0% 100%)'
          }} />
        </div>

        {/* Checkbox */}
        <input 
          type="checkbox" 
          className="mr-2" 
          checked={isSelected} 
          onChange={handleCheckboxClick}
          onClick={handleCheckboxClick}
        />

        {/* Node Text */}
        <a 
          href={node.data.href} 
          className="text-blue-600 hover:underline text-sm cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {node.data.name}
        </a>

        {/* Comment */}
        {node.data.comment && (
          <span className="ml-2 text-xs text-gray-500 italic">
            {node.data.comment}
          </span>
        )}
      </div>
    );
  };

  if (!filteredRoots.length) {
    return <div className="text-gray-500 p-4">No tree data available</div>;
  }

  return (
    <div className="border border-gray-300 rounded bg-white overflow-y-auto" style={{ height: '400px' }}>
      <Tree
        data={filteredRoots}
        openByDefault={true}
        width="100%"
        height={400}
        rowHeight={24}
        paddingTop={8}
        paddingBottom={8}
        paddingLeft={0}
        paddingRight={8}
        indent={0} // We handle indentation manually
        onActivate={() => {}} // Disable default activation
      >
        {Node}
      </Tree>
    </div>
  );
}


