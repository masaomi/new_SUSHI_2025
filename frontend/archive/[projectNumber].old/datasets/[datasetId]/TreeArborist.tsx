'use client';

import { useRouter } from 'next/navigation';
import { DatasetTreeNode } from '@/lib/types/dataset';
import { Tree } from 'react-arborist';

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

  const handleNodeClick = (node: TreeNode) => {
    router.push(`/projects/${projectNumber}/datasets/${node.originalId}`);
  };

  const Node = ({ node, style, dragHandle, tree }: any) => {
    const isExpanded = node.isOpen;
    const hasChildren = node.children && node.children.length > 0;
    const isCurrentDataset = node.data.isCurrentDataset;
    const level = node.level;

    const handleExpandToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        node.toggle();
      }
    };

    const handleNameClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleNodeClick(node.data);
    };


    return (
      <div
        ref={dragHandle}
        style={{
          ...style,
          paddingLeft: `${level * 18}px`,
          marginLeft: '8px',
        }}
        className={`
          relative flex items-center py-1 hover:bg-gray-50 cursor-pointer select-none
          ${isCurrentDataset ? 'bg-blue-50' : ''}
        `}
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

        {/* Node Text */}
        <span 
          className={`
            cursor-pointer hover:underline text-sm
            ${isCurrentDataset ? 'font-bold text-blue-700' : 'text-gray-800'}
          `}
          onClick={handleNameClick}
        >
          {node.data.name}
        </span>

        {/* Comment */}
        {node.data.comment && (
          <span className="ml-2 text-xs text-gray-500 italic">
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
    <div className="border border-gray-300 rounded bg-white p-2" style={{ height: '400px' }}>
      <Tree
        data={treeData}
        openByDefault={true}
        width="100%"
        height={400}
        rowHeight={24}
        paddingTop={4}
        paddingBottom={4}
        indent={0} // We handle indentation manually
        onActivate={() => {}} // Disable default activation
      >
        {Node}
      </Tree>
    </div>
  );
}
