'use client';

import { useState, useCallback, useEffect, Dispatch, SetStateAction, RefObject } from 'react';
import { Node, Edge, NodeChange, NodePositionChange, ReactFlowInstance, OnNodesChange } from 'reactflow';
import { MindMapData, NodePosition, MindMapNode, COLUMN_WIDTH, LayoutOptions } from '../types';

interface UseMindMapNodeManagementProps {
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  mindMapData: MindMapData | null;
  setMindMapData: Dispatch<SetStateAction<MindMapData | null>>;
  onNodesChangeOriginal: OnNodesChange; 
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>; 
  addFollowUpNodeRef: RefObject<any>; // Correct type based on addFollowUpNode's signature
  deleteNodeRef: RefObject<any>; // Correct type based on deleteNode's signature
  currentLayout: LayoutOptions;
  toggleChildrenVisibility: (nodeId: string) => void;
  collapsedNodes: Set<string>;
  setCollapsedNodes: Dispatch<SetStateAction<Set<string>>>;
}

export function useMindMapNodeManagement({
  nodes,
  setNodes,
  edges,
  setEdges,
  mindMapData,
  setMindMapData,
  onNodesChangeOriginal,
  reactFlowInstanceRef, 
  addFollowUpNodeRef,
  deleteNodeRef,
  currentLayout,
  toggleChildrenVisibility,
  collapsedNodes, // Keep if needed for node data updates
  setCollapsedNodes,
}: UseMindMapNodeManagementProps) {
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});

  const updateNodeData = useCallback((nodeId: string, newData: { title?: string; description?: string; width?: number; pageNumber?: number; expanded?: boolean }) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
              updateNodeData, // Pass itself for recursive use if needed by CustomNode
              toggleChildrenVisibility,
              hasChildren: node.data.hasChildren,
              childrenCollapsed: node.data.childrenCollapsed,
              nodeType: node.data.nodeType,
            },
          };
        }
        return node;
      })
    );

    if (mindMapData) {
      const updatedMindMapData = {
        ...mindMapData,
        nodes: mindMapData.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              title: newData.title ?? n.title,
              description: newData.description ?? n.description,
              type: n.type,
              ...(newData.expanded !== undefined && { expanded: newData.expanded }),
              __contentOnlyUpdate: true,
            };
          }
          return n;
        }),
        __contentOnlyUpdate: true,
      };
      setTimeout(() => {
        setMindMapData(updatedMindMapData);
      }, 0);
    }
  }, [mindMapData, setNodes, setMindMapData, toggleChildrenVisibility]); // Added setMindMapData

  const addFollowUpNode = useCallback((parentId: string, question: string, answer: string, customNodeId?: string): string => {
    if (!mindMapData) {
      console.error("Cannot add follow-up node: mindMapData is null");
      return customNodeId || `error-node-${Date.now()}`;
    }

    const newNodeId = customNodeId || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let parentMindMapNode = mindMapData.nodes.find(node => node.id === parentId);

    if (!parentMindMapNode) {
        const parentFlowNode = nodes.find(node => node.id === parentId);
        if (parentFlowNode) {
            const grandparentId = parentFlowNode.data.parentId;
            let level = 1; 
            if (grandparentId) {
                const grandparent = mindMapData.nodes.find(node => node.id === grandparentId);
                if (grandparent) level = grandparent.level + 1;
            }
            const placeholderNode: MindMapNode = {
                id: parentId, title: parentFlowNode.data.title || '', description: parentFlowNode.data.description || '',
                parentId: grandparentId || null, level: level, type: 'qna'
            };
            mindMapData.nodes.push(placeholderNode);
            parentMindMapNode = placeholderNode;
        } else {
            console.log(`Node with ID ${parentId} not found. Using fallback.`);
            parentMindMapNode = { id: parentId, title: 'Unknown Node', description: '', parentId: null, level: 1, type: 'regular' };
        }
    }
    
    const parentFlowNode = nodes.find(node => node.id === parentId);
    const parentPageNumber = parentFlowNode?.data?.pageNumber;
    const parentOpenPdfViewer = parentFlowNode?.data?.openPdfViewer;

    const currentNodePositions: Record<string, NodePosition> = {};
    if (reactFlowInstanceRef.current) {
      try {
        const currentNodes = reactFlowInstanceRef.current.getNodes();
        currentNodes.forEach((node: { id: string; position: NodePosition }) => {
          currentNodePositions[node.id] = node.position;
        });
      } catch (error) {
        console.warn('Could not get node positions from reactFlowInstance:', error);
      }
    }

    let currentParentPos: NodePosition | null = currentNodePositions[parentId] || nodes.find(n => n.id === parentId)?.position || null;
    if (!currentParentPos) {
        console.log(`Cannot determine position for parent node ${parentId}. Using default.`);
        currentParentPos = { x: 100, y: 100 };
    }

    const isBlankNode = question === 'Double Click to Edit' && answer === 'Double-click to add a description';
    const nodeType = isBlankNode ? 'blank' as const : 'qna' as const;

    const newNode: MindMapNode = {
      id: newNodeId,
      title: question,
      description: answer,
      parentId: parentId,
      level: parentMindMapNode.level + 1,
      type: nodeType,
      pageNumber: parentPageNumber,
      // openPdfViewer: parentOpenPdfViewer // This was not in the original MindMapNode type, decide if needed
    };

    const siblingNodes = nodes.filter(node => {
      try {
        const nodeData = mindMapData.nodes.find(n => n.id === node.id);
        return nodeData && nodeData.parentId === parentId;
      } catch (e) { return false; }
    });

    const siblingCount = siblingNodes.length;
    const offsetMultiplier = siblingCount > 0 ? siblingCount : 0;
    const siblingSpacing = 30;
    const isHorizontalLayout = !currentLayout?.direction || currentLayout.direction === 'LR' || currentLayout.direction === 'RL';
    const newNodePosition = { 
      x: currentParentPos.x + (isHorizontalLayout ? COLUMN_WIDTH : offsetMultiplier * siblingSpacing), 
      y: currentParentPos.y + (isHorizontalLayout ? offsetMultiplier * siblingSpacing : COLUMN_WIDTH)
    };

    const newFlowNode: Node = {
      id: newNodeId, type: 'custom', position: newNodePosition,
      data: {
        title: question, description: answer, updateNodeData,
        addFollowUpNode: addFollowUpNodeRef.current, 
        deleteNode: deleteNodeRef.current, 
        nodeType: nodeType, expanded: true, lastCreatedNodeId: newNodeId,
        hasChildren: false, childrenCollapsed: false, toggleChildrenVisibility,
        width: 256, pageNumber: parentPageNumber, openPdfViewer: parentOpenPdfViewer,
        layoutDirection: currentLayout?.direction
      },
      style: { border: '2px solid #bfdbfe', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', zIndex: 1000 },
      className: 'node-card'
    };

    const newEdge: Edge = {
      id: `e-${parentId}-${newNodeId}`, source: parentId, target: newNodeId,
      sourceHandle: 'source', targetHandle: 'target', type: 'bezier',
      style: { stroke: '#3182CE', strokeWidth: 1.5, strokeOpacity: 0.8, zIndex: 1000 },
      animated: false, className: 'mindmap-edge'
    };

    const positionsToSet = { ...currentNodePositions, [newNodeId]: newNodePosition };

    setNodes(currentNodes => {
      const nodesWithUpdatedPositions = currentNodes.map(node => {
        const currentPosition = currentNodePositions[node.id];
        return currentPosition ? { ...node, position: currentPosition } : node;
      });
      const parentIndex = nodesWithUpdatedPositions.findIndex(node => node.id === parentId);
      if (parentIndex !== -1) {
        nodesWithUpdatedPositions[parentIndex] = {
          ...nodesWithUpdatedPositions[parentIndex],
          data: { ...nodesWithUpdatedPositions[parentIndex].data, hasChildren: true, childrenCollapsed: false }
        };
      }
      return [...nodesWithUpdatedPositions, newFlowNode];
    });

    setEdges(currentEdges => [...currentEdges, newEdge]);

    const updatedMindMapData = { 
      ...(mindMapData || { nodes: [] }), 
      nodes: [...(mindMapData?.nodes || []), newNode],
      __nodeAddition: true 
    };
    setMindMapData(updatedMindMapData);

    setTimeout(() => {
      setNodePositions(prev => ({ ...prev, ...positionsToSet }));
    }, 0);

    return newNodeId;
  }, [ mindMapData, setMindMapData, nodes, setNodes, setEdges, reactFlowInstanceRef, currentLayout, updateNodeData, addFollowUpNodeRef, deleteNodeRef, toggleChildrenVisibility, setNodePositions ]);

  const deleteNode = useCallback((nodeId: string) => {
    let parentId: string | undefined = undefined;
    let childrenToReparent: string[] = [];

    setNodes(currentNodes => {
      const nodeToDelete = currentNodes.find(n => n.id === nodeId);
      parentId = nodeToDelete?.data.parentId; 
      childrenToReparent = currentNodes.filter(n => n.data.parentId === nodeId).map(n => n.id);
      let updatedNodes = currentNodes.filter(node => node.id !== nodeId);

      if (parentId && childrenToReparent.length > 0) {
        updatedNodes = updatedNodes.map(node => {
          if (childrenToReparent.includes(node.id)) {
            return { ...node, data: { ...node.data, parentId: parentId } };
          }
          return node;
        });
      }

      if (parentId) {
        const parentStillHasChildren = updatedNodes.some(node => node.data.parentId === parentId);
        updatedNodes = updatedNodes.map(node => {
          if (node.id === parentId) {
            return { ...node, data: { ...node.data, hasChildren: parentStillHasChildren } };
          }
          return node;
        });
      }
      return updatedNodes;
    });

    setEdges(currentEdges => {
      let updatedEdges = currentEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      if (parentId && childrenToReparent.length > 0) {
        childrenToReparent.forEach(childId => {
          const uniqueEdgeId = `e-${parentId}-${childId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          updatedEdges.push({
            id: uniqueEdgeId, source: parentId!, target: childId, sourceHandle: 'source', targetHandle: 'target',
            type: 'bezier', style: { stroke: '#3182CE', strokeWidth: 1.5, strokeOpacity: 0.8 }, animated: false, className: 'mindmap-edge'
          });
        });
      }
      return updatedEdges;
    });

    setNodePositions(prev => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });

    setCollapsedNodes(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(nodeId)) newCollapsed.delete(nodeId);
      return newCollapsed;
    });

    setTimeout(() => {
        setMindMapData(prevData => {
            if (!prevData) return null;
            let updatedMindMapNodes = prevData.nodes.filter(node => node.id !== nodeId);
            if (parentId && childrenToReparent.length > 0) {
                 updatedMindMapNodes = updatedMindMapNodes.map(node => {
                    if (childrenToReparent.includes(node.id)) {
                        return { ...node, parentId: parentId ?? null }; 
                    }
                    return node;
                });
            }
            return { ...prevData, nodes: updatedMindMapNodes, __internalUpdate: true };
        });
    }, 0);
  }, [setNodes, setEdges, setNodePositions, setCollapsedNodes, setMindMapData]);

  useEffect(() => {
    addFollowUpNodeRef.current = addFollowUpNode;
    deleteNodeRef.current = deleteNode;
  }, [addFollowUpNode, deleteNode, addFollowUpNodeRef, deleteNodeRef]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeOriginal(changes);
    const dragStopChanges = changes.filter(
      (change): change is NodePositionChange =>
        change.type === 'position' && change.dragging === false && change.position !== undefined
    );
    if (dragStopChanges.length > 0) {
      setNodePositions(prev => {
        const newPositions = { ...prev };
        dragStopChanges.forEach(change => {
          if (change.position) newPositions[change.id] = change.position;
        });
        return newPositions;
      });
    }
  }, [onNodesChangeOriginal, setNodePositions]);

  return {
    nodePositions, setNodePositions,
    updateNodeData,
    addFollowUpNode,
    deleteNode,
    onNodesChange: handleNodesChange,
  };
}
