'use client';

import { useCallback, useEffect, Dispatch, SetStateAction, RefObject } from 'react';
import { Node, Edge, ReactFlowInstance } from 'reactflow';
import {
  MindMapData, NodePosition, MindMapNode, LayoutOptions, 
  LAYOUT_PRESETS, createMindMapLayout, updateMindMapLayout
} from '../types';

interface UseMindMapLayoutProps {
  mindMapData: MindMapData | null;
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  edges: Edge[]; // Added for cycleLayout
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  previousLayoutIndexRef: RefObject<number>;
  positionsToApplyRef: RefObject<Record<string, NodePosition>>;
  addFollowUpNodeRef: RefObject<any>; // Type based on actual function
  deleteNodeRef: RefObject<any>;    // Type based on actual function
  updateNodeData: (nodeId: string, newData: any) => void; // Adjust 'any' to specific type
  nodePositions: Record<string, NodePosition>;
  setNodePositions: Dispatch<SetStateAction<Record<string, NodePosition>>>;
  toggleChildrenVisibility: (nodeId: string) => void;
  collapsedNodes: Set<string>;
  currentLayoutIndex: number;
  setCurrentLayoutIndex: Dispatch<SetStateAction<number>>;
  currentLayout: LayoutOptions; // Pass the derived currentLayout object
  loading: boolean; // Added loading state from main hook
}

export function useMindMapLayout({
  mindMapData,
  nodes,
  setNodes,
  edges, // Added
  setEdges,
  reactFlowInstanceRef,
  previousLayoutIndexRef,
  positionsToApplyRef,
  addFollowUpNodeRef,
  deleteNodeRef,
  updateNodeData,
  nodePositions,
  setNodePositions,
  toggleChildrenVisibility,
  collapsedNodes,
  currentLayoutIndex,
  setCurrentLayoutIndex,
  currentLayout, // Use this directly
  loading, // Added
}: UseMindMapLayoutProps) {

  const handleResetView = useCallback(() => {
    if (reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.fitView({
        padding: 0.4,
        includeHiddenNodes: false,
        duration: 800,
      });
      if (mindMapData) {
        const currentNodesFromInstance = reactFlowInstanceRef.current.getNodes();
        const positions: Record<string, NodePosition> = {};
        currentNodesFromInstance.forEach((node: { id: string; position: NodePosition }) => {
          positions[node.id] = node.position;
        });
        setNodePositions(positions);
        // The updateMindMapLayout was used to apply positions to nodes, 
        // but react-flow should handle this if positions are part of node objects or via setNodes.
        // If direct mutation is needed, ensure it's done correctly.
        // For now, assuming setNodes with updated positions is the React way.
        const updatedNodes = updateMindMapLayout(nodes, positions); // This utility might still be useful
        setNodes(updatedNodes);
      }
    }
  }, [mindMapData, nodes, setNodes, reactFlowInstanceRef, setNodePositions]);

  const cycleLayout = useCallback(() => {
    const nextLayoutIndex = (currentLayoutIndex + 1) % LAYOUT_PRESETS.length;
    setCurrentLayoutIndex(nextLayoutIndex);
    
    // Layout generation logic will be triggered by the useEffect below that watches currentLayoutIndex/currentLayout

  }, [currentLayoutIndex, setCurrentLayoutIndex]);

  // Effect to create/update layout when mindMapData or currentLayout changes
  useEffect(() => {
    if (mindMapData && !loading) {
      const isContentOnlyUpdate = (mindMapData as any).__contentOnlyUpdate === true;
      const isNodeAddition = (mindMapData as any).__nodeAddition === true;

      if (isContentOnlyUpdate) {
        setNodes(currentNodes =>
          currentNodes.map(node => {
            const mmNode = mindMapData.nodes.find(n => n.id === node.id);
            if (mmNode) {
              return {
                ...node,
                data: {
                  ...node.data,
                  title: mmNode.title,
                  description: mmNode.description,
                  addFollowUpNode: addFollowUpNodeRef.current,
                  deleteNode: deleteNodeRef.current,
                  toggleChildrenVisibility,
                  layoutDirection: node.data.layoutDirection || currentLayout.direction,
                },
              };
            }
            return node;
          })
        );
        return;
      }

      if (isNodeAddition) return;

      const currentPositionsFromInstance: Record<string, NodePosition> = {};
      if (reactFlowInstanceRef.current && nodes.length > 0) {
        try {
          const flowNodesFromInstance = reactFlowInstanceRef.current.getNodes();
          flowNodesFromInstance.forEach((node: { id: string; position: NodePosition }) => {
            currentPositionsFromInstance[node.id] = node.position;
          });
        } catch (error) { console.warn('Could not get node positions from reactFlowInstance:', error); }
      }
      
      let updatedMindMapData = { ...mindMapData };
      if (reactFlowInstanceRef.current) {
        const currentFlowNodes = reactFlowInstanceRef.current.getNodes();
        const missingNodesInMindMap = currentFlowNodes.filter(flowNode => 
          !mindMapData.nodes.some(mmNode => mmNode.id === flowNode.id)
        );

        if (missingNodesInMindMap.length > 0) {
            const edgeMap: Record<string, string> = {};
            const allEdges = reactFlowInstanceRef.current.getEdges();
            allEdges.forEach((edge: Edge) => { edgeMap[edge.target as string] = edge.source as string; });

            const newMindMapNodes: MindMapNode[] = missingNodesInMindMap.map((node: Node) => {
                const parentId = edgeMap[node.id] || null;
                let level = 0;
                if (parentId) {
                    const parentNode = mindMapData.nodes.find(n => n.id === parentId) || 
                                     updatedMindMapData.nodes.find(n => n.id === parentId);
                    if (parentNode) level = parentNode.level + 1;
                }
                return {
                    id: node.id, title: node.data.title || '', description: node.data.description || '',
                    parentId: parentId, level: level, type: node.data.nodeType || 'qna',
                    pageNumber: node.data.pageNumber
                };
            });
            updatedMindMapData.nodes = [...updatedMindMapData.nodes, ...newMindMapNodes];
        }
      }

      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
        updatedMindMapData,
        updateNodeData,
        currentLayout
      );

      const isLayoutChange = currentLayoutIndex !== previousLayoutIndexRef.current;
      const isInitialLoad = nodes.length === 0;

      const nodesWithFunctions = flowNodes.map(node => {
        // For layout changes or initial load, the position from createMindMapLayout (in `node.position`) is authoritative.
        // For other updates (e.g., mindMapData change not triggering layout type change),
        // we might preserve existing user-dragged positions if the layout algorithm doesn't account for them.
        // However, createMindMapLayout should ideally manage this.
        // The simplest approach for cycleLayout to work is to always take `node.position` from `createMindMapLayout`.
        
        // If NOT a layout change, and an existing position is available, preserve it.
        // Otherwise, use the position from createMindMapLayout.
        // This attempts to keep user-dragged positions unless the layout type itself changes.
        const preservePosition = !isLayoutChange && !isInitialLoad && (currentPositionsFromInstance[node.id] || nodePositions[node.id]);
        
        return {
          ...node, // Contains node.position from createMindMapLayout
          position: preservePosition ? preservePosition : node.position, // Apply preserved position if applicable
          data: {
            ...node.data,
            addFollowUpNode: addFollowUpNodeRef.current,
            deleteNode: deleteNodeRef.current,
            toggleChildrenVisibility,
            layoutDirection: currentLayout.direction,
            hasChildren: !!(updatedMindMapData.nodes.find(n => n.parentId === node.id)),
            childrenCollapsed: collapsedNodes.has(node.id),
            pageNumber: node.data.pageNumber !== undefined ? node.data.pageNumber : updatedMindMapData.nodes.find(n => n.id === node.id)?.pageNumber,
          },
        };
      });
      
      previousLayoutIndexRef.current = currentLayoutIndex;
      
      setNodes(nodesWithFunctions);
      setEdges(flowEdges);

      // If it\'s an initial load or a layout change, update nodePositions state with the new layout\'s positions
      // and fit the view.
      if (isInitialLoad || isLayoutChange) {
        const newPositionsFromLayout: Record<string, NodePosition> = {};
        nodesWithFunctions.forEach(n => {
          if (n.position) { // Ensure position is defined
            newPositionsFromLayout[n.id] = n.position;
          }
        });
        setNodePositions(newPositionsFromLayout); // Update nodePositions to reflect the new layout

        setTimeout(() => {
          if (reactFlowInstanceRef.current) {
            reactFlowInstanceRef.current.fitView({ padding: 0.4, duration: 800, includeHiddenNodes: false });
          }
        }, 100);
      }
      // Removed the previous logic that used positionsToApplyRef for setNodePositions,
      // as it could conflict with applying the new layout positions.
    }
  }, [mindMapData, currentLayout, loading, nodes.length, updateNodeData, toggleChildrenVisibility, collapsedNodes, setNodes, setEdges, setNodePositions, reactFlowInstanceRef, nodePositions, addFollowUpNodeRef, deleteNodeRef, previousLayoutIndexRef, currentLayoutIndex]);

  // Effect to update node handlers, hasChildren, and layoutDirection in nodes data (similar to original lines ~744-781)
  useEffect(() => {
    if (mindMapData && nodes.length > 0) {
      const parentToChildren: Record<string, boolean> = {};
      mindMapData.nodes.forEach((node: MindMapNode) => {
        if (node.parentId) parentToChildren[node.parentId] = true;
      });

      setNodes(currentNodes =>
        currentNodes.map(node => {
          const mindMapNode = mindMapData.nodes.find(n => n.id === node.id);
          const position = nodePositions[node.id] || node.position; // Prefer tracked position
          return {
            ...node,
            position,
            data: {
              ...node.data,
              addFollowUpNode: addFollowUpNodeRef.current,
              deleteNode: deleteNodeRef.current,
              hasChildren: !!parentToChildren[node.id],
              childrenCollapsed: collapsedNodes.has(node.id),
              toggleChildrenVisibility,
              pageNumber: node.data.pageNumber !== undefined ? node.data.pageNumber : mindMapNode?.pageNumber,
              layoutDirection: node.data.layoutDirection || currentLayout.direction, // Ensure layoutDirection is set
            },
          };
        })
      );
    }
  }, [mindMapData, nodes.length, collapsedNodes, toggleChildrenVisibility, nodePositions, setNodes, addFollowUpNodeRef, deleteNodeRef, currentLayout.direction]); // Added currentLayout.direction

  return {
    handleResetView,
    cycleLayout,
    // currentLayoutIndex is managed in the main hook now
    // setCurrentLayoutIndex is managed in the main hook now
  };
}
