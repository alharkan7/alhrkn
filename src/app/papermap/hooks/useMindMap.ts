'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, useNodesState, useEdgesState } from 'reactflow';
import { MindMapData, NodePosition, MindMapNode } from '../components/MindMapTypes';
import { createMindMapLayout, updateMindMapLayout } from '../components/MindMapLayout';

export function useMindMap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<any>(null);
  
  // Create a ref to hold the latest addFollowUpNode implementation
  const addFollowUpNodeRef = useRef<(parentId: string, question: string, answer: string, customNodeId?: string) => string>((parentId, question, answer, customNodeId) => {
    console.error("addFollowUpNode called before initialization");
    return customNodeId || '';
  });

  // Check if a node has children
  const hasChildren = useCallback((nodeId: string) => {
    if (!mindMapData) return false;
    return mindMapData.nodes.some(node => node.parentId === nodeId);
  }, [mindMapData]);
  
  // Get all descendant node IDs (recursive)
  const getDescendantIds = useCallback((nodeId: string, nodeMap: Record<string, string[]>): string[] => {
    const children = nodeMap[nodeId] || [];
    const descendants = [...children];
    
    children.forEach(childId => {
      const childDescendants = getDescendantIds(childId, nodeMap);
      descendants.push(...childDescendants);
    });
    
    return descendants;
  }, []);

  // Toggle visibility of children nodes
  const toggleChildrenVisibility = useCallback((nodeId: string) => {
    // If mindMapData is not available, do nothing
    if (!mindMapData) return;
    
    // Create a mapping of parent ID to children IDs for faster lookup
    const parentToChildren: Record<string, string[]> = {};
    mindMapData.nodes.forEach(node => {
      if (node.parentId) {
        if (!parentToChildren[node.parentId]) {
          parentToChildren[node.parentId] = [];
        }
        parentToChildren[node.parentId].push(node.id);
      }
    });
    
    setCollapsedNodes(prev => {
      const newCollapsed = new Set(prev);
      
      // Toggle collapsed state for this node
      if (newCollapsed.has(nodeId)) {
        newCollapsed.delete(nodeId);
      } else {
        newCollapsed.add(nodeId);
      }
      
      return newCollapsed;
    });
    
    // Update node visibility based on collapsed state
    updateNodeVisibility();
  }, [mindMapData]);
  
  // Update node visibility based on collapsed state
  const updateNodeVisibility = useCallback(() => {
    // If mindMapData is not available, do nothing
    if (!mindMapData) return;
    
    // Create a mapping of parent ID to children IDs for faster lookup
    const parentToChildren: Record<string, string[]> = {};
    mindMapData.nodes.forEach(node => {
      if (node.parentId) {
        if (!parentToChildren[node.parentId]) {
          parentToChildren[node.parentId] = [];
        }
        parentToChildren[node.parentId].push(node.id);
      }
    });
    
    // Find all nodes that should be hidden due to their ancestor being collapsed
    const nodesToHide = new Set<string>();
    collapsedNodes.forEach(collapsedId => {
      const descendants = getDescendantIds(collapsedId, parentToChildren);
      descendants.forEach(id => nodesToHide.add(id));
    });
    
    // Update nodes with visibility and hasChildren data
    setNodes(currentNodes => 
      currentNodes.map(node => {
        const nodeHasChildren = !!parentToChildren[node.id]?.length;
        const childrenCollapsed = collapsedNodes.has(node.id);
        
        return {
          ...node,
          hidden: nodesToHide.has(node.id),
          data: {
            ...node.data,
            hasChildren: nodeHasChildren,
            childrenCollapsed: childrenCollapsed,
            toggleChildrenVisibility: toggleChildrenVisibility
          }
        };
      })
    );
    
    // Update edges - hide edges connected to hidden nodes
    setEdges(currentEdges => 
      currentEdges.map(edge => ({
        ...edge,
        hidden: nodesToHide.has(edge.target)
      }))
    );
  }, [collapsedNodes, mindMapData, getDescendantIds, toggleChildrenVisibility, setNodes, setEdges]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, newData: {title?: string; description?: string; width?: number}) => {
    // Apply visual feedback for the edited node (like a subtle highlight)
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId) {
          // Add a subtle animation/highlight to the node that was just edited
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
              updateNodeData, // Keep the update function in the data
              hasChildren: node.data.hasChildren,
              childrenCollapsed: node.data.childrenCollapsed,
              toggleChildrenVisibility
            },
            style: {
              ...node.style,
              borderColor: node.data.nodeType === 'qna' ? '#bfdbfe' : '#4299e1', // Keep QnA styling if it's a QnA node
              boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)',
            },
            className: 'node-card updating' // Add updating class for transition effect
          };
        }
        return node;
      })
    );
    
    // After a short delay, reset the style
    setTimeout(() => {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === nodeId) {
            const isQnA = node.data.nodeType === 'qna';
            return {
              ...node,
              style: {
                ...node.style,
                borderColor: isQnA ? '#bfdbfe' : '#e2e8f0', // Keep QnA styling
                backgroundColor: isQnA ? '#eff6ff' : '#ffffff', // Keep QnA background
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              className: 'node-card' // Remove updating class to prevent transitions during drag
            };
          }
          return node;
        })
      );
    }, 1000);
    
    // Also update the mindMapData
    if (mindMapData) {
      setMindMapData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: prev.nodes.map((n) => {
            if (n.id === nodeId) {
              return {
                ...n,
                title: newData.title ?? n.title,
                description: newData.description ?? n.description
              };
            }
            return n;
          })
        };
      });
    }
  }, [mindMapData, setNodes, toggleChildrenVisibility]);

  // Add a new follow-up node
  const addFollowUpNode = (parentId: string, question: string, answer: string, customNodeId?: string): string => {
    console.log('DIRECT addFollowUpNode called with mindMapData:', mindMapData ? 'exists' : 'null');
    
    // Generate a unique ID for the new node or use the provided ID
    const newNodeId = customNodeId || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find the parent node to determine the level
    if (!mindMapData) {
      console.error("Cannot add follow-up node: mindMapData is null");
      return newNodeId;
    }
    
    const parentNode = mindMapData.nodes.find(node => node.id === parentId);
    if (!parentNode) {
      console.error(`Cannot add follow-up node: parent node with id ${parentId} not found`);
      return newNodeId;
    }

    console.log('Adding follow-up node:', { parentId, question, answer: answer.substring(0, 50) + '...', nodeId: newNodeId });
    
    // Find the parent node in ReactFlow nodes
    const parentFlowNode = nodes.find(node => node.id === parentId);
    if (!parentFlowNode) {
      console.error(`Cannot add follow-up node: parent ReactFlow node with id ${parentId} not found`);
      return newNodeId;
    }
    
    // Create the new node with question as title and answer as description
    const newNode = {
      id: newNodeId,
      title: question,
      description: answer,
      parentId: parentId,
      level: parentNode.level + 1,
      type: 'qna' as 'regular' | 'qna' // Mark as a QnA node
    };
    
    // Update mindMapData with the new node
    setMindMapData(prevData => {
      if (!prevData) return null;
      const updatedData = {
        ...prevData,
        nodes: [...prevData.nodes, newNode]
      };
      console.log('Updated mindMapData, node count:', updatedData.nodes.length);
      return updatedData;
    });
    
    // Get parent node position
    const parentPos = parentFlowNode.position;
    
    // Calculate position for the new node
    // Find how many siblings this node has to calculate vertical offset
    const siblings = mindMapData.nodes.filter(n => n.parentId === parentId);
    
    // Calculate appropriate vertical offset
    let verticalOffset = 0;
    
    if (siblings.length === 0) {
      // First child should be aligned with parent
      verticalOffset = 0;
    } else {
      // Place below existing siblings
      verticalOffset = siblings.length * 160; // NODE_VERTICAL_SPACING
    }
    
    const newNodePosition = { 
      x: parentPos.x + 550, // COLUMN_WIDTH
      y: parentPos.y + verticalOffset
    };
    
    console.log('New node position:', {
      newNodePosition,
      parentPos,
      siblingCount: siblings.length,
      verticalOffset
    });
    
    // Store the ID of the last created node in all nodes' data for reference in async operations
    const lastCreatedNodeId = newNodeId;
    
    // Create ReactFlow node
    const newFlowNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: newNodePosition,
      data: { 
        title: question,
        description: answer,
        updateNodeData,
        addFollowUpNode,
        nodeType: 'qna', // Set the nodeType for QnA nodes
        expanded: true, // Set expanded to true for QnA nodes
        lastCreatedNodeId, // Store reference to this node ID for updates
        hasChildren: false,
        childrenCollapsed: false,
        toggleChildrenVisibility,
        width: 256 // Default width for new nodes
      },
      style: {
        border: '2px solid #4299e1', // Highlight the new node
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)',
        zIndex: 1000, // Ensure it's on top
      },
      className: 'node-card updating'
    };
    
    // Create edge from parent to new node
    const newEdge: Edge = {
      id: `e-${parentId}-${newNodeId}`,
      source: parentId,
      target: newNodeId,
      sourceHandle: 'source',
      targetHandle: 'target',
      type: 'bezier',
      style: { 
        stroke: '#3182CE', 
        strokeWidth: 2, 
        strokeOpacity: 1, 
        zIndex: 1000 
      },
      animated: false,
      className: 'mindmap-edge'
    };
    
    // Update nodes and edges - use functional updates to ensure latest state
    setNodes(currentNodes => {
      const updatedNodes = [...currentNodes, newFlowNode];
      console.log('Updated nodes array:', updatedNodes.length, 'nodes');
      
      // Also update the parent node to show it has children
      return updatedNodes.map(node => {
        if (node.id === parentId) {
          return {
            ...node,
            data: {
              ...node.data,
              hasChildren: true
            }
          };
        }
        return node;
      });
    });
    
    setEdges(currentEdges => {
      const updatedEdges = [...currentEdges, newEdge];
      console.log('Updated edges array:', updatedEdges.length, 'edges');
      return updatedEdges;
    });
    
    // Update all nodes to have reference to the last created node ID
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          lastCreatedNodeId
        }
      }))
    );
    
    // Reset the highlight after a moment
    setTimeout(() => {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          if (node.id === newNodeId) {
            return {
              ...node,
              style: {
                ...node.style,
                border: '2px solid #bfdbfe', // QnA node border color
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              className: 'node-card'
            };
          }
          return node;
        })
      );
    }, 2000);
    
    // Fit view after a longer delay to ensure the new node is properly rendered
    setTimeout(() => {
      if (reactFlowInstance.current) {
        console.log('Fitting view to include new node');
        reactFlowInstance.current.fitView({ 
          padding: 0.4, 
          duration: 800,
          includeHiddenNodes: false,
        });
      }
    }, 500);
    
    // Return the node ID for reference
    return newNodeId;
  };
  
  // Always update the reference
  useEffect(() => {
    // Update the ref with the latest implementation that has access to current state
    addFollowUpNodeRef.current = addFollowUpNode;
  });
  
  // Create a stable function that always calls the latest implementation
  const stableAddFollowUpNode = useCallback((parentId: string, question: string, answer: string, customNodeId?: string) => {
    console.log('Stable addFollowUpNode called, delegating to current implementation');
    // Always call the latest implementation from the ref
    const nodeId = addFollowUpNodeRef.current(parentId, question, answer, customNodeId);
    return nodeId || customNodeId || ''; // Ensure we always return a string
  }, []);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Store the PDF data in localStorage for future API calls
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        if (typeof base64data === 'string') {
          const base64Content = base64data.split(',')[1];
          localStorage.setItem('pdfData', base64Content);
          console.log('PDF data stored in localStorage, size:', base64Content.length);
        }
      };
      reader.readAsDataURL(file);
      
      const response = await fetch('/api/papermap', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process the paper');
      }
      
      const data = await response.json();
      setMindMapData(data);
      
      console.log('API Response:', data);
      
      // Convert MindMap data to ReactFlow elements
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(data, updateNodeData);
      
      // Create a map of parent to children for checking if nodes have children
      const parentToChildren: Record<string, boolean> = {};
      data.nodes.forEach((node: MindMapNode) => {
        if (node.parentId) {
          parentToChildren[node.parentId] = true;
        }
      });
      
      // Add the addFollowUpNode function to all nodes' data and mark nodes with children
      const nodesWithFollowUp = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode, // Use the stable function
          hasChildren: !!parentToChildren[node.id],
          childrenCollapsed: false,
          toggleChildrenVisibility
        }
      }));
      
      console.log('Setting nodes:', nodesWithFollowUp.length);
      console.log('Setting edges:', flowEdges.length);
      
      setNodes(nodesWithFollowUp);
      setEdges(flowEdges);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to analyze the paper');
    } finally {
      setLoading(false);
    }
  };

  // Update node visibility when collapsed nodes or mindMapData change
  useEffect(() => {
    updateNodeVisibility();
  }, [collapsedNodes, mindMapData, updateNodeVisibility]);

  // Force update node handlers when mindMapData changes
  useEffect(() => {
    if (mindMapData && nodes.length > 0) {
      console.log('Updating addFollowUpNode references due to mindMapData change');
      
      // Create a map of parent to children for checking if nodes have children
      const parentToChildren: Record<string, boolean> = {};
      mindMapData.nodes.forEach((node: MindMapNode) => {
        if (node.parentId) {
          parentToChildren[node.parentId] = true;
        }
      });
      
      // Update all nodes with the current addFollowUpNode function
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            addFollowUpNode: stableAddFollowUpNode, // Use the stable function
            hasChildren: !!parentToChildren[node.id],
            childrenCollapsed: collapsedNodes.has(node.id),
            toggleChildrenVisibility
          }
        }))
      );
    }
  }, [mindMapData, stableAddFollowUpNode, collapsedNodes, toggleChildrenVisibility, setNodes]);

  // Reset zoom and center the view
  const handleResetView = useCallback(() => {
    // Only fit view to current node positions, don't recreate or reposition nodes
    if (reactFlowInstance.current) {
      // Use consistent padding settings for predictable view
      reactFlowInstance.current.fitView({ 
        padding: 0.4,
        includeHiddenNodes: false,
        duration: 800
      });
      
      // Update node positions for download component based on current positions
      if (mindMapData) {
        const currentNodes = reactFlowInstance.current.getNodes();
        const positions: Record<string, NodePosition> = {};
        currentNodes.forEach((node: { id: string; position: NodePosition }) => {
          positions[node.id] = node.position;
        });
        setNodePositions(positions);
        
        // Apply the updated positions to the nodes
        const updatedNodes = updateMindMapLayout(nodes, positions);
        setNodes(updatedNodes);
      }
    }
  }, [mindMapData, nodes, setNodes]);

  return {
    loading,
    error,
    mindMapData,
    nodes,
    edges,
    nodePositions,
    reactFlowWrapper,
    reactFlowInstance,
    setMindMapData,
    onNodesChange,
    onEdgesChange,
    handleFileUpload,
    handleResetView,
    updateNodeData,
    stableAddFollowUpNode
  };
} 