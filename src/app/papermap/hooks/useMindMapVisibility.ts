'use client';

import { useState, useCallback, useEffect, useMemo, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from 'reactflow';
import { MindMapData } from '../types';

interface UseMindMapVisibilityProps {
  mindMapData: MindMapData | null;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

export function useMindMapVisibility({
  mindMapData,
  setNodes,
  setEdges,
}: UseMindMapVisibilityProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const parentToChildrenMap = useMemo(() => {
    if (!mindMapData) return {};
    const map: Record<string, string[]> = {};
    mindMapData.nodes.forEach(node => {
      if (node.parentId) {
        if (!map[node.parentId]) {
          map[node.parentId] = [];
        }
        map[node.parentId].push(node.id);
      }
    });
    return map;
  }, [mindMapData?.nodes]);

  const getDescendantIds = useCallback((nodeId: string, nodeMap: Record<string, string[]>): string[] => {
    const children = nodeMap[nodeId] || [];
    const descendants = [...children];
    children.forEach(childId => {
      const childDescendants = getDescendantIds(childId, nodeMap);
      descendants.push(...childDescendants);
    });
    return descendants;
  }, []);

  const toggleChildrenVisibility = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(nodeId)) {
        newCollapsed.delete(nodeId);
      } else {
        newCollapsed.add(nodeId);
      }
      return newCollapsed;
    });
  }, [setCollapsedNodes]);

  const updateNodeVisibility = useCallback(() => {
    if (!mindMapData || Object.keys(parentToChildrenMap).length === 0) return;

    const nodesToHide = new Set<string>();
    collapsedNodes.forEach(collapsedId => {
      const descendants = getDescendantIds(collapsedId, parentToChildrenMap);
      descendants.forEach(id => nodesToHide.add(id));
    });

    setNodes(currentNodes =>
      currentNodes.map(node => {
        const nodeHasChildren = !!parentToChildrenMap[node.id]?.length;
        const childrenCollapsed = collapsedNodes.has(node.id);
        return {
          ...node,
          hidden: nodesToHide.has(node.id),
          data: {
            ...node.data,
            hasChildren: nodeHasChildren,
            childrenCollapsed: childrenCollapsed,
            toggleChildrenVisibility: toggleChildrenVisibility, 
            nodeType: node.data.nodeType,
          },
        };
      })
    );

    setEdges(currentEdges =>
      currentEdges.map(edge => ({
        ...edge,
        hidden: nodesToHide.has(edge.target as string),
      }))
    );
  }, [mindMapData, parentToChildrenMap, collapsedNodes, getDescendantIds, setNodes, setEdges, toggleChildrenVisibility]);

  useEffect(() => {
    updateNodeVisibility();
  }, [updateNodeVisibility]);
  
  // This useEffect was in the original hook, ensure its dependencies are correct here or in the main hook.
  // It seems to update visibility when collapsedNodes or mindMapData change, which is already covered by the above useEffect.
  // Consider if this one is redundant or if its specific dependencies (collapsedNodes, mindMapData) are still needed.
  // For now, I'll keep it, assuming it might serve a purpose related to how React schedules updates.
  useEffect(() => {
    updateNodeVisibility();
  }, [collapsedNodes, mindMapData, updateNodeVisibility]);

  return {
    collapsedNodes, setCollapsedNodes, // Expose setCollapsedNodes if needed externally
    toggleChildrenVisibility,
    updateNodeVisibilityHook: updateNodeVisibility, // Renamed to avoid conflict if used as a prop
    parentToChildrenMap, // May be useful for other hooks
  };
}
