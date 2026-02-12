'use client';

import { useMemo } from 'react';
import Tree from 'rc-tree';
import type { Key } from 'rc-tree/es/interface';
import 'rc-tree/assets/index.css';

interface DatasetTreeProps {
  treeNodes: any[];
  projectNumber: number;
  /** Checkbox mode – provide both to enable checkboxes */
  selectedIds?: Set<number>;
  onSelectionChange?: (selected: Set<number>) => void;
  /** Search filter (datasets list page) */
  searchQuery?: string;
  /** Highlight a specific dataset (detail page) */
  currentDatasetId?: number;
}

interface RcTreeNode {
  key: string;
  title: string;
  comment?: string;
  href: string;
  originalId: number;
  children?: RcTreeNode[];
}

function nodeName(node: any): string {
  return node.dataset_data?.name ?? node.name ?? `#${node.id}`;
}

function nodeComment(node: any): string | undefined {
  return node.dataset_data?.comment ?? node.comment;
}

function nodeHref(node: any, projectNumber: number): string {
  return node.a_attr?.href ?? `/projects/${projectNumber}/datasets/${node.id}`;
}

export default function DatasetTreeRcTree({
  treeNodes,
  projectNumber,
  selectedIds,
  onSelectionChange,
  searchQuery = '',
  currentDatasetId,
}: DatasetTreeProps) {
  const hasCheckboxes = selectedIds !== undefined && onSelectionChange !== undefined;

  const roots = useMemo(() => {
    const nodeMap = new Map<string, RcTreeNode>();
    const rootNodes: RcTreeNode[] = [];

    for (const n of treeNodes) {
      nodeMap.set(String(n.id), {
        key: String(n.id),
        title: nodeName(n),
        comment: nodeComment(n),
        href: nodeHref(n, projectNumber),
        originalId: n.id,
        children: [],
      });
    }

    for (const n of treeNodes) {
      const treeNode = nodeMap.get(String(n.id));
      if (!treeNode) continue;

      if (n.parent === '#') {
        rootNodes.push(treeNode);
      } else {
        const parent = nodeMap.get(String(n.parent));
        parent?.children?.push(treeNode);
      }
    }

    return rootNodes;
  }, [treeNodes, projectNumber]);

  const filteredRoots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roots;

    const filter = (nodes: RcTreeNode[]): RcTreeNode[] =>
      nodes
        .map((node) => {
          const filteredChildren = filter(node.children ?? []);
          const selfMatch = node.title.toLowerCase().includes(q);
          if (selfMatch || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean) as RcTreeNode[];

    return filter(roots);
  }, [roots, searchQuery]);

  const checkedKeys = useMemo(
    () => (selectedIds ? Array.from(selectedIds).map(String) : []),
    [selectedIds],
  );

  const handleCheck = (
    checked: Key[] | { checked: Key[]; halfChecked: Key[] },
  ) => {
    if (!onSelectionChange) return;
    const keys = Array.isArray(checked) ? checked : checked.checked;
    onSelectionChange(new Set(keys.map((k) => Number(k))));
  };

  const titleRender = (node: any) => {
    const isCurrent = currentDatasetId !== undefined && node.originalId === currentDatasetId;
    return (
      <span>
        <a
          href={node.href}
          className={`no-underline rounded px-1 hover:bg-blue-100 ${
            isCurrent ? 'font-bold text-blue-700' : 'text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {node.title}
        </a>
        {node.comment && (
          <span className="text-xs text-gray-500 italic ml-1">{node.comment}</span>
        )}
      </span>
    );
  };

  if (!filteredRoots.length) {
    return <div className="text-gray-500 p-4">No tree data available</div>;
  }

  return (
    <div className="border border-gray-300 rounded bg-white overflow-auto p-2"
         style={{ maxHeight: 500 }}>
      <style>{`
        .rc-tree-icon__close,
        .rc-tree-icon__docu { background-position: -110px -16px !important; }
      `}</style>
      <Tree
        treeData={filteredRoots}
        defaultExpandAll
        checkable={hasCheckboxes}
        checkStrictly={hasCheckboxes}
        checkedKeys={hasCheckboxes ? checkedKeys : undefined}
        onCheck={hasCheckboxes ? handleCheck : undefined}
        selectable={false}
        showLine
        showIcon
        titleRender={titleRender}
      />
    </div>
  );
}
