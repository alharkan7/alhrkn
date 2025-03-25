'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, useNodesState, useEdgesState, NodeChange, NodePositionChange } from 'reactflow';
import { MindMapData, NodePosition, MindMapNode, COLUMN_WIDTH } from '../components/MindMapTypes';
import { createMindMapLayout, updateMindMapLayout } from '../components/MindMapLayout';

// Example mindmap data and PDF URL
const EXAMPLE_PDF_URL = '/Steve_Jobs_Stanford_Commencement_Speech_2015.pdf'; // This should be placed in your public folder
const EXAMPLE_MINDMAP: MindMapData = {
  "nodes": [
    {
      "description": "This commencement speech at Stanford University shares three life stories illustrating the importance of trusting intuition, embracing failure, and facing mortality.",
      "id": "node1",
      "level": 0,
      "parentId": null,
      "title": "Life Lessons from Stanford Commencement Speech",
      "pageNumber": 1
    },
    {
      "description": "The first story emphasizes connecting seemingly unrelated experiences to discover meaning and purpose in life.  It highlights the unexpected value of a calligraphy class, which later influenced the design of the Macintosh computer.",
      "id": "node2",
      "level": 1,
      "parentId": "node1",
      "title": "Connecting the Dots: Intuition and Unexpected Value",
      "pageNumber": 1
    },
    {
      "description": "Dropping out of Reed College after six months allowed the speaker to focus on classes of interest, including calligraphy, which unexpectedly proved crucial years later in the development of the Macintosh.",
      "id": "node3",
      "level": 2,
      "parentId": "node2",
      "title": "Reed College Dropout and Calligraphy",
      "pageNumber": 1
    },
    {
      "description": "The calligraphy class taught principles of typography and design that were later incorporated into the Macintosh's design, demonstrating the long-term value of seemingly unrelated experiences.",
      "id": "node4",
      "level": 3,
      "parentId": "node3",
      "title": "Calligraphy's Influence on Macintosh Design",
      "pageNumber": 1
    },
    {
      "description": "The second story discusses the speaker's experience of being fired from Apple and how this led to the creation of NeXT and Pixar, emphasizing the importance of resilience and pursuing one's passions.",
      "id": "node5",
      "level": 1,
      "parentId": "node1",
      "title": "Love and Loss: Resilience and Passion",
      "pageNumber": 2
    },
    {
      "description": "Being fired from Apple, though initially devastating, allowed the speaker to pursue new ventures, leading to the creation of NeXT and Pixar, and ultimately, a return to Apple.",
      "id": "node6",
      "level": 2,
      "parentId": "node5",
      "title": "Firing from Apple and Subsequent Successes",
      "pageNumber": 2
    },
    {
      "description": "The creation of Pixar, which produced the world's first computer-animated feature film, is highlighted as a significant achievement stemming from the experience of being fired from Apple.",
      "id": "node7",
      "level": 3,
      "parentId": "node6",
      "title": "Pixar's Success and First Computer-Animated Film",
      "pageNumber": 2
    },
    {
      "description": "The third story focuses on the importance of contemplating one's mortality and how this awareness can guide decision-making, encouraging individuals to prioritize their passions and values.",
      "id": "node8",
      "level": 1,
      "parentId": "node1",
      "title": "Death: Facing Mortality and Following Your Heart",
      "pageNumber": 3
    },
    {
      "description": "A personal experience with a cancer diagnosis is shared to emphasize the importance of living each day to the fullest and not wasting time on things that do not matter.",
      "id": "node9",
      "level": 2,
      "parentId": "node8",
      "title": "Cancer Diagnosis and Life's Priorities",
      "pageNumber": 3
    },
    {
      "description": "The speech concludes with the message \"Stay Hungry, Stay Foolish,\" urging the graduates to maintain their passion and curiosity throughout their lives.",
      "id": "node10",
      "level": 2,
      "parentId": "node8",
      "title": "Concluding Message: Stay Hungry, Stay Foolish",
      "pageNumber": 3
    }
  ]
};

export function useMindMap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(EXAMPLE_MINDMAP); // Initialize with example data
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(EXAMPLE_PDF_URL); // Initialize with example PDF URL
  
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
              border: node.data.nodeType === 'qna' 
                ? '2px solid #bfdbfe' 
                : '2px solid #4299e1', // Keep QnA styling if it's a QnA node
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
                border: isQnA ? '2px solid #bfdbfe' : '2px solid #4299e1', // Keep QnA styling
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
    
    // Instead of manually positioning, use dagre to calculate position
    // First, collect all existing nodes in the same level as this new node
    const allNodesAtLevel = nodes.filter(node => {
      const nodeData = mindMapData.nodes.find(n => n.id === node.id);
      return nodeData && nodeData.level === parentNode.level + 1;
    });

    // Parent node position
    const parentPos = parentFlowNode.position;
    
    // Default position before dagre calculation (will be properly positioned later)
    const newNodePosition = { 
      x: parentPos.x + COLUMN_WIDTH, 
      y: parentPos.y
    };
    
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
    
    // After node is added, recalculate positions with dagre
    setTimeout(() => {
      // Re-run dagre to layout all nodes and prevent overlaps
      if (mindMapData && mindMapData.nodes.length > 1) {
        // Create a new layout with the updated data - only to get position for the new node
        import('../components/MindMapLayout').then(({ createMindMapLayout, updateMindMapLayout }) => {
          // First try to use current node positions if they're being tracked
          let updatedNodes;
          
          if (Object.keys(nodePositions).length > 0) {
            // We have tracked positions, use them to calculate layout
            console.log('Using tracked node positions');
            
            // Get layout for new node
            const { nodes: layoutNodes } = createMindMapLayout(
              { nodes: mindMapData.nodes },
              updateNodeData
            );
            
            // Find position for new node only
            const newNodeLayout = layoutNodes.find(n => n.id === newNodeId);
            
            // Apply positions: Keep existing nodes where they are, position new node
            setNodes(currentNodes => {
              return currentNodes.map(node => {
                if (node.id === newNodeId && newNodeLayout) {
                  // Position the new node using the layout
                  return {
                    ...node,
                    position: newNodeLayout.position
                  };
                } else if (nodePositions[node.id]) {
                  // Use tracked positions for existing nodes
                  return {
                    ...node,
                    position: nodePositions[node.id]
                  };
                }
                // Fall back to current position
                return node;
              });
            });
          } else {
            // No tracked positions, fall back to only updating the new node
            const { nodes: newNodes } = createMindMapLayout(
              { nodes: mindMapData.nodes }, 
              updateNodeData
            );
            
            // Apply the new position only to the newly created node, preserve existing node positions
            setNodes(currentNodes => {
              return currentNodes.map(node => {
                // Only update the position of the newly created node
                if (node.id === newNodeId) {
                  const newLayoutNode = newNodes.find(n => n.id === newNodeId);
                  if (newLayoutNode) {
                    return {
                      ...node,
                      position: newLayoutNode.position
                    };
                  }
                }
                // Keep existing positions for all other nodes
                return node;
              });
            });
          }
        });
      } else {
        // Comment out or remove fitView call to maintain user's view
        /*
        if (reactFlowInstance.current) {
          console.log('Fitting view to include new node');
          reactFlowInstance.current.fitView({ 
            padding: 0.4, 
            duration: 800,
            includeHiddenNodes: false,
          });
        }
        */
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
  
  // Create an effect to track node position changes
  useEffect(() => {
    // This effect updates nodePositions whenever nodes are dragged
    if (reactFlowInstance.current) {
      const updateNodePositionsAfterDrag = () => {
        const currentNodes = reactFlowInstance.current.getNodes();
        const positions: Record<string, NodePosition> = {};
        currentNodes.forEach((node: { id: string; position: NodePosition }) => {
          positions[node.id] = node.position;
        });
        console.log('Node positions updated after drag');
        setNodePositions(positions);
      };
      
      // Add event listener for node drag end
      const reactFlowElement = document.querySelector('.react-flow');
      if (reactFlowElement) {
        reactFlowElement.addEventListener('mouseup', updateNodePositionsAfterDrag);
        reactFlowElement.addEventListener('touchend', updateNodePositionsAfterDrag);
        
        return () => {
          reactFlowElement.removeEventListener('mouseup', updateNodePositionsAfterDrag);
          reactFlowElement.removeEventListener('touchend', updateNodePositionsAfterDrag);
        };
      }
    }
  }, [reactFlowInstance]);
  
  // Create a stable function that always calls the latest implementation
  const stableAddFollowUpNode = useCallback((parentId: string, question: string, answer: string, customNodeId?: string) => {
    console.log('Stable addFollowUpNode called, delegating to current implementation');
    // Always call the latest implementation from the ref
    const nodeId = addFollowUpNodeRef.current(parentId, question, answer, customNodeId);
    return nodeId || customNodeId || ''; // Ensure we always return a string
  }, []);

  // Function to load example mindmap
  const loadExampleMindMap = useCallback(() => {
    setLoading(true);
    
    // Reset to example data
    setMindMapData(EXAMPLE_MINDMAP);
    setPdfUrl(EXAMPLE_PDF_URL);
    setError(null);
    
    // Process the example data
    const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(EXAMPLE_MINDMAP, updateNodeData);
    
    // Add the addFollowUpNode function to all nodes' data
    const nodesWithFollowUp = flowNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        addFollowUpNode: stableAddFollowUpNode,
        toggleChildrenVisibility
      }
    }));
    
    setNodes(nodesWithFollowUp);
    setEdges(flowEdges);
    
    // Fit view after nodes are set
    setTimeout(() => {
      if (reactFlowInstance.current) {
        reactFlowInstance.current.fitView({ 
          padding: 0.4, 
          duration: 800,
          includeHiddenNodes: false
        });
      }
    }, 100);
    
    setLoading(false);
  }, [updateNodeData, stableAddFollowUpNode, toggleChildrenVisibility]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setPdfUrl(null); // Clear the example PDF URL when new file is uploaded
    
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
      // Debug: Check if page numbers exist in the API response
      const nodesWithPageNumbers = data.nodes.filter((node: MindMapNode) => node.pageNumber != null);
      console.log(`CLIENT: API returned ${nodesWithPageNumbers.length} out of ${data.nodes.length} nodes with page numbers`);
      if (nodesWithPageNumbers.length > 0) {
        console.log('CLIENT: Sample node with page number:', nodesWithPageNumbers[0]);
      }
      
      // Convert MindMap data to ReactFlow elements using dagre-based layout
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(data, updateNodeData);
      
      // Debug: Check if page numbers were preserved in the flow nodes
      const flowNodesWithPageNumbers = flowNodes.filter(node => node.data.pageNumber != null);
      console.log(`CLIENT: Layout conversion preserved ${flowNodesWithPageNumbers.length} out of ${flowNodes.length} nodes with page numbers`);
      
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
          toggleChildrenVisibility,
          // Preserve pageNumber if it exists in the data
          pageNumber: node.data.pageNumber
        }
      }));
      
      // Debug: Check if page numbers still exist after adding other props
      const finalNodesWithPageNumbers = nodesWithFollowUp.filter(node => node.data.pageNumber != null);
      console.log(`CLIENT: Final nodes have ${finalNodesWithPageNumbers.length} out of ${nodesWithFollowUp.length} with page numbers`);
      
      console.log('Setting nodes:', nodesWithFollowUp.length);
      console.log('Setting edges:', flowEdges.length);
      
      setNodes(nodesWithFollowUp);
      setEdges(flowEdges);
      
      // After nodes are set, ensure we fit view
      setTimeout(() => {
        if (reactFlowInstance.current) {
          reactFlowInstance.current.fitView({ 
            padding: 0.4, 
            duration: 800,
            includeHiddenNodes: false
          });
        }
      }, 100);
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
      // Preserve positions of existing nodes when updating
      setNodes(currentNodes => 
        currentNodes.map(node => {
          // Find the corresponding node in the mindMapData to get its pageNumber
          const mindMapNode = mindMapData.nodes.find(n => n.id === node.id);
          
          // Preserve node's current position if it exists in nodePositions
          const position = nodePositions[node.id] || node.position;
          
          return {
            ...node,
            position, // Preserve position
            data: {
              ...node.data,
              addFollowUpNode: stableAddFollowUpNode, // Use the stable function
              hasChildren: !!parentToChildren[node.id],
              childrenCollapsed: collapsedNodes.has(node.id),
              toggleChildrenVisibility,
              // Preserve pageNumber from mindMapData if available
              pageNumber: node.data.pageNumber !== undefined ? node.data.pageNumber : mindMapNode?.pageNumber
            }
          };
        })
      );
    }
  }, [mindMapData, nodes.length, stableAddFollowUpNode, collapsedNodes, toggleChildrenVisibility, nodePositions]);

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

  // Effect to create initial flow when mindMapData is set
  useEffect(() => {
    if (mindMapData && nodes.length === 0) {
      console.log('Creating initial flow from mindMapData');
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(mindMapData, updateNodeData);
      
      // Add the addFollowUpNode function to all nodes' data
      const nodesWithFollowUp = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode,
          toggleChildrenVisibility
        }
      }));
      
      setNodes(nodesWithFollowUp);
      setEdges(flowEdges);
      
      // Fit view after nodes are set
      setTimeout(() => {
        if (reactFlowInstance.current) {
          reactFlowInstance.current.fitView({ 
            padding: 0.4, 
            duration: 800,
            includeHiddenNodes: false
          });
        }
      }, 100);
    }
  }, [mindMapData, nodes.length, updateNodeData, stableAddFollowUpNode, toggleChildrenVisibility]);

  // Customize onNodesChange to track positions after node drags
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Call the original onNodesChange
    onNodesChange(changes);
    
    // After position changes, update the nodePositions state
    const positionChanges = changes.filter(
      (change): change is NodePositionChange => change.type === 'position' && change.position !== undefined
    );
    
    if (positionChanges.length > 0) {
      // Update positions for the dragged nodes
      setNodePositions(prev => {
        const newPositions = { ...prev };
        positionChanges.forEach(change => {
          if (change.position) {
            newPositions[change.id] = change.position;
          }
        });
        return newPositions;
      });
    }
  }, [onNodesChange]);

  return {
    loading,
    error,
    mindMapData,
    nodes,
    edges,
    nodePositions,
    reactFlowWrapper,
    reactFlowInstance,
    onNodesChange: handleNodesChange,
    onEdgesChange,
    handleFileUpload,
    addFollowUpNode: addFollowUpNodeRef.current,
    handleResetView,
    loadExampleMindMap, // Expose the function to load example mindmap
    pdfUrl // Expose the PDF URL
  };
} 