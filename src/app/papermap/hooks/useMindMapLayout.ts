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
  layoutInitialized: boolean; // Added for initial layout stability
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
  layoutInitialized, // Added
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
    if (mindMapData && !loading && layoutInitialized) {
      const isContentOnlyUpdate = (mindMapData as any).__contentOnlyUpdate === true;
      const isNodeAddition = (mindMapData as any).__nodeAddition === true;

      if (isContentOnlyUpdate) {
        // For content-only updates, we might not need to re-calculate hidden,
        // assuming it's handled by useMindMapVisibility or nodes already have it.
        // However, to be safe and consistent, let's ensure data props are updated.
        // The hidden status itself is more critical in the main layouting path below.
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
                  // hasChildren and childrenCollapsed should ideally be from node.data if already set
                  // by useMindMapVisibility, or re-evaluated if necessary.
                  hasChildren: node.data.hasChildren !== undefined ? node.data.hasChildren : !!(mindMapData.nodes.find(n => n.parentId === node.id)),
                  childrenCollapsed: node.data.childrenCollapsed !== undefined ? node.data.childrenCollapsed : collapsedNodes.has(node.id),
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

      // --- Logic for determining hidden nodes ---
      const parentToChildrenMapForLayout: Record<string, string[]> = {};
      if (updatedMindMapData) {
        updatedMindMapData.nodes.forEach(n => {
          if (n.parentId) {
            if (!parentToChildrenMapForLayout[n.parentId]) {
              parentToChildrenMapForLayout[n.parentId] = [];
            }
            parentToChildrenMapForLayout[n.parentId].push(n.id);
          }
        });
      }

      // Pure function, can be defined here or outside if preferred and passed in.
      const getDescendantIdsForLayout = (nodeId: string, nodeMap: Record<string, string[]>): string[] => {
        const children = nodeMap[nodeId] || [];
        const descendants = [...children];
        children.forEach(childId => {
          const childDescendants = getDescendantIdsForLayout(childId, nodeMap);
          descendants.push(...childDescendants);
        });
        return descendants;
      };

      const nodesToHideForLayout = new Set<string>();
      collapsedNodes.forEach(collapsedId => {
        const descendants = getDescendantIdsForLayout(collapsedId, parentToChildrenMapForLayout);
        descendants.forEach(id => nodesToHideForLayout.add(id));
      });
      // --- End of logic for determining hidden nodes ---

      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
        updatedMindMapData,
        updateNodeData, // updateNodeData is used by createMindMapLayout
        currentLayout
      );

      const isLayoutChange = currentLayoutIndex !== previousLayoutIndexRef.current;
      const isInitialLoad = nodes.length === 0;

      const nodesWithFunctions = flowNodes.map(node => {
        const preservePosition = !isLayoutChange && !isInitialLoad && (currentPositionsFromInstance[node.id] || nodePositions[node.id]);
        
        // Determine if this node itself is a child of a collapsed node.
        // This is slightly different from nodesToHideForLayout which contains descendants.
        // A node is hidden if it's in nodesToHideForLayout.
        const nodeIsHidden = nodesToHideForLayout.has(node.id);
        const nodeHasChildren = !!parentToChildrenMapForLayout[node.id]?.length;
        const childrenAreCollapsed = collapsedNodes.has(node.id);

        return {
          ...node,
          hidden: nodeIsHidden, // Apply hidden status
          position: preservePosition ? preservePosition : node.position,
          data: {
            ...node.data,
            addFollowUpNode: addFollowUpNodeRef.current,
            deleteNode: deleteNodeRef.current,
            toggleChildrenVisibility,
            layoutDirection: currentLayout.direction,
            hasChildren: nodeHasChildren,
            childrenCollapsed: childrenAreCollapsed,
            pageNumber: node.data.pageNumber !== undefined ? node.data.pageNumber : updatedMindMapData.nodes.find(n => n.id === node.id)?.pageNumber,
            // Ensure updateNodeData is passed if CustomNode needs it directly from layout-generated nodes
            updateNodeData: updateNodeData, 
          },
        };
      });
      
      previousLayoutIndexRef.current = currentLayoutIndex;
      
      setNodes(nodesWithFunctions);
      setEdges(flowEdges);

      if (isInitialLoad || isLayoutChange) {
        const newPositions: Record<string, NodePosition> = {};
        nodesWithFunctions.forEach(n => { if (!n.hidden) newPositions[n.id] = n.position; }); // Store positions only for visible nodes
        setNodePositions(newPositions);
        positionsToApplyRef.current = newPositions;
      }

      if ((isInitialLoad || isLayoutChange) && reactFlowInstanceRef.current) {
        setTimeout(() => {
          reactFlowInstanceRef.current?.fitView({ padding: 0.4, duration: 800, includeHiddenNodes: false });
        }, 100);
      }
    }
  }, [
    mindMapData, 
    currentLayout, 
    updateNodeData, 
    setNodes, 
    setEdges, 
    reactFlowInstanceRef, 
    previousLayoutIndexRef, 
    positionsToApplyRef, 
    addFollowUpNodeRef, 
    deleteNodeRef, 
    toggleChildrenVisibility, 
    collapsedNodes, 
    nodePositions, // Keep for preservePosition logic, but monitor for loops
    setNodePositions, 
    loading, 
    layoutInitialized,
    currentLayoutIndex,
  ]);

  // Effect to update node handlers, hasChildren, and layoutDirection in nodes data
  useEffect(() => {
    if (mindMapData && nodes.length > 0) {
      const parentToChildrenForEffect: Record<string, string[]> = {};
      mindMapData.nodes.forEach((node: MindMapNode) => {
        if (node.parentId) {
          if (!parentToChildrenForEffect[node.parentId]) {
            parentToChildrenForEffect[node.parentId] = [];
          }
          parentToChildrenForEffect[node.parentId].push(node.id);
        }
      });

      const getDescendantIdsForEffect = (nodeId: string, nodeMap: Record<string, string[]>): string[] => {
        const children = nodeMap[nodeId] || [];
        const descendants = [...children];
        children.forEach(childId => {
          const childDescendants = getDescendantIdsForEffect(childId, nodeMap);
          descendants.push(...childDescendants);
        });
        return descendants;
      };
      
      const nodesToHideForEffect = new Set<string>();
      collapsedNodes.forEach(collapsedId => {
        const descendants = getDescendantIdsForEffect(collapsedId, parentToChildrenForEffect);
        descendants.forEach(id => nodesToHideForEffect.add(id));
      });

      setNodes(currentNodes =>
        currentNodes.map(node => {
          const mindMapNode = mindMapData.nodes.find(n => n.id === node.id);
          const position = nodePositions[node.id] || node.position;
          const nodeIsHidden = nodesToHideForEffect.has(node.id);
          const nodeHasChildren = !!parentToChildrenForEffect[node.id]?.length;
          const childrenAreCollapsed = collapsedNodes.has(node.id);

          return {
            ...node,
            hidden: nodeIsHidden, // Apply hidden status
            position,
            data: {
              ...node.data,
              title: mindMapNode ? mindMapNode.title : node.data.title,
              description: mindMapNode ? mindMapNode.description : node.data.description,
              addFollowUpNode: addFollowUpNodeRef.current,
              deleteNode: deleteNodeRef.current,
              toggleChildrenVisibility,
              hasChildren: nodeHasChildren,
              childrenCollapsed: childrenAreCollapsed,
              layoutDirection: currentLayout.direction,
              nodeType: mindMapNode?.type || node.data.nodeType,
              pageNumber: mindMapNode?.pageNumber !== undefined ? mindMapNode.pageNumber : node.data.pageNumber,
              updateNodeData: updateNodeData,
            },
          };
        })
      );
    }
  }, [
    mindMapData, 
    edges,
    nodePositions, 
    collapsedNodes, 
    setNodes, 
    currentLayout, 
    addFollowUpNodeRef, 
    deleteNodeRef, 
    toggleChildrenVisibility, 
    updateNodeData
  ]);

  return {
    handleResetView,
    cycleLayout,
    // currentLayoutIndex is managed in the main hook now
    // setCurrentLayoutIndex is managed in the main hook now
  };
}
