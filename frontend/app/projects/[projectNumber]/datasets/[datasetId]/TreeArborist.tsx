'use client';

import { useRouter } from 'next/navigation';
import { DatasetTreeNode } from '@/lib/types/dataset';
import { Tree } from 'react-arborist';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface TreeArboristProps {
  datasetTree: DatasetTreeNode[];
  datasetId: number;
  projectNumber: number;
}

interface TreeNode {
  id: string;
  name: string;
  comment?: string;
  children?: TreeNode[];
  isCurrentDataset: boolean;
  originalId: number;
}

export default function TreeArborist({ datasetTree, datasetId, projectNumber }: TreeArboristProps) {
  const router = useRouter();

  // Transform flat tree data to hierarchical structure
  const transformTreeData = (flatData: DatasetTreeNode[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // First pass: Create all nodes
    flatData.forEach(node => {
      const treeNode: TreeNode = {
        id: node.id.toString(),
        name: node.name,
        comment: node.comment,
        children: [],
        isCurrentDataset: node.id === datasetId,
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

  const treeData = transformTreeData(datasetTree);

  const handleNodeActivation = (node: TreeNode) => {
    if (node.originalId !== datasetId) {
      router.push(`/projects/${projectNumber}/datasets/${node.originalId}`);
    }
  };

  const Node = ({ node, style, dragHandle }: any) => {
    const isExpanded = node.isOpen;
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = node.data.isCurrentDataset;

    return (
      <div 
        ref={dragHandle} 
        style={style} 
        className={`
          flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 
          ${isSelected ? 'bg-blue-50 font-bold text-blue-600' : ''}
        `}
        onClick={() => handleNodeActivation(node.data)}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )
          ) : null}
        </div>

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
        <span className={`flex-1 ${isSelected ? 'font-bold' : ''}`}>
          {node.data.name}
        </span>

        {/* Comment */}
        {node.data.comment && (
          <span className="text-xs text-gray-500 ml-2">
            {node.data.comment}
          </span>
        )}
      </div>
    );
  };

  if (!treeData.length) {
    return <div className="text-gray-500 p-4">No tree data available</div>;
  }

  return (
    <div className="h-64 border rounded-lg bg-white">
      <Tree
        data={treeData}
        openByDefault={true}
        width="100%"
        height={250}
        rowHeight={32}
        paddingTop={8}
        paddingBottom={8}
        indent={20}
        onActivate={(node) => handleNodeActivation(node.data)}
      >
        {Node}
      </Tree>
    </div>
  );
}