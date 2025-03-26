'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, useNodesState, useEdgesState, NodeChange, NodePositionChange } from 'reactflow';
import { MindMapData, NodePosition, MindMapNode, COLUMN_WIDTH } from '../types';
import { createMindMapLayout, updateMindMapLayout, LayoutOptions, LAYOUT_PRESETS, DEFAULT_LAYOUT_OPTIONS } from '../types';

// Example mindmap data and PDF URL
const EXAMPLE_PDF_URL = '/Steve_Jobs_Stanford_Commencement_Speech_2015.pdf'; // This should be placed in your public folder

// Expose the example PDF URL globally for other components to use
if (typeof window !== 'undefined') {
  (window as any).EXAMPLE_PDF_URL = EXAMPLE_PDF_URL;
}

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

// Function to fetch and store PDF as base64 in localStorage
const fetchAndStorePdfData = async (pdfUrl: string) => {
  try {
    console.log('Fetching example PDF:', pdfUrl);
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch example PDF');
    }
    
    const pdfBlob = await response.blob();
    const reader = new FileReader();
    
    return new Promise<void>((resolve, reject) => {
      reader.onloadend = () => {
        const base64data = reader.result;
        if (typeof base64data === 'string') {
          const base64Content = base64data.split(',')[1];
          localStorage.setItem('pdfData', base64Content);
          console.log('Example PDF data stored in localStorage, size:', base64Content.length);
          resolve();
        } else {
          reject(new Error('Failed to convert PDF to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error('Error storing example PDF:', error);
    throw error;
  }
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
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState<number>(0); // Current layout index
  const currentLayout = LAYOUT_PRESETS[currentLayoutIndex]; // Current layout options
  
  // Create a ref to hold the latest addFollowUpNode implementation
  const addFollowUpNodeRef = useRef<(parentId: string, question: string, answer: string, customNodeId?: string) => string>((parentId, question, answer, customNodeId) => {
    console.error("addFollowUpNode called before initialization");
    return customNodeId || '';
  });

  // Add deleteNode reference 
  const deleteNodeRef = useRef<(nodeId: string) => void>((nodeId) => {
    console.error("deleteNode called before initialization");
  });
  
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
      x: parentPos.x + (currentLayout?.direction === 'TB' || currentLayout?.direction === 'BT' ? 0 : COLUMN_WIDTH), 
      y: parentPos.y + (currentLayout?.direction === 'TB' || currentLayout?.direction === 'BT' ? COLUMN_WIDTH : 0)
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
        deleteNode: stableDeleteNode, // Add deleteNode function
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
        import('../types').then(({ createMindMapLayout, updateMindMapLayout }) => {
          // First try to use current node positions if they're being tracked
          let updatedNodes;
          
          if (Object.keys(nodePositions).length > 0) {
            // We have tracked positions, use them to calculate layout
            console.log('Using tracked node positions for new node');
            
            try {
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
                    console.log(`Positioning new node ${newNodeId} at x:${newNodeLayout.position.x}, y:${newNodeLayout.position.y}`);
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
            } catch (error) {
              console.error('Error updating layout for new node:', error);
              // If there's an error, just position the new node relatively to its parent
              setNodes(currentNodes => {
                return currentNodes.map(node => {
                  if (node.id === newNodeId) {
                    const parentNode = currentNodes.find(n => n.id === parentId);
                    if (parentNode) {
                      // Calculate a position below the parent
                      return {
                        ...node,
                        position: {
                          x: parentNode.position.x + (currentLayout?.direction === 'TB' || currentLayout?.direction === 'BT' ? 0 : COLUMN_WIDTH),
                          y: parentNode.position.y + (currentLayout?.direction === 'TB' || currentLayout?.direction === 'BT' ? COLUMN_WIDTH : 100)
                        }
                      };
                    }
                  }
                  return node;
                });
              });
            }
          } else {
            // No tracked positions, fall back to only updating the new node
            try {
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
                      console.log(`Positioning new node ${newNodeId} with complete layout at x:${newLayoutNode.position.x}, y:${newLayoutNode.position.y}`);
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
            } catch (error) {
              console.error('Error in complete layout for new node:', error);
            }
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
  
  // Always update the references
  useEffect(() => {
    // Update the ref with the latest implementation that has access to current state
    addFollowUpNodeRef.current = addFollowUpNode;
    deleteNodeRef.current = deleteNode;
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

  // Create a stable function for deleteNode
  const stableDeleteNode = useCallback((nodeId: string) => {
    console.log('Stable deleteNode called, delegating to current implementation');
    // Always call the latest implementation from the ref
    deleteNodeRef.current(nodeId);
  }, []);

  // Function to load example mindmap
  const loadExampleMindMap = useCallback(() => {
    setLoading(true);
    
    // Reset to example data
    setMindMapData(EXAMPLE_MINDMAP);
    setPdfUrl(EXAMPLE_PDF_URL);
    setError(null);
    
    // Fetch and store the example PDF data in localStorage
    fetchAndStorePdfData(EXAMPLE_PDF_URL)
      .then(async () => {
        console.log('Example PDF data successfully stored in localStorage');
        
        // Initialize a session with the example PDF data
        const pdfData = localStorage.getItem('pdfData');
        if (pdfData) {
          try {
            // Initialize a session for the example PDF
            const sessionResponse = await fetch('/api/papermap/initialize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ pdfData })
            });
            
            if (sessionResponse.ok) {
              const { sessionId, sessionData } = await sessionResponse.json();
              // Store session data
              if (sessionId) localStorage.setItem('pdfSessionId', sessionId);
              if (sessionData) localStorage.setItem('pdfSessionData', sessionData);
              console.log('Session initialized for example PDF follow-up questions');
            }
          } catch (error) {
            console.error('Failed to initialize session for example PDF:', error);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to store example PDF:', error);
        setError('Error loading example PDF. Some features may not work.');
      });
    
    try {
      console.log('Creating layout for example mindmap');
      // Process the example data
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(EXAMPLE_MINDMAP, updateNodeData);
      
      // Add the addFollowUpNode function to all nodes' data
      const nodesWithFollowUp = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode,
          deleteNode: stableDeleteNode, // Add deleteNode function
          toggleChildrenVisibility
        }
      }));
      
      console.log(`Created example mindmap with ${nodesWithFollowUp.length} nodes and ${flowEdges.length} edges`);
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
    } catch (error) {
      console.error('Error creating example mindmap layout:', error);
      setError('Error creating mindmap. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [updateNodeData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility]);

  // Fetch example PDF data on initial load if using example mindmap
  useEffect(() => {
    if (mindMapData === EXAMPLE_MINDMAP && pdfUrl === EXAMPLE_PDF_URL) {
      // Check if the PDF data is already in localStorage
      const existingPdfData = localStorage.getItem('pdfData');
      if (!existingPdfData) {
        console.log('Example mindmap is loaded but PDF data not in localStorage, fetching it now');
        fetchAndStorePdfData(EXAMPLE_PDF_URL)
          .then(async () => {
            // Initialize a session with the example PDF data when app first loads
            const pdfData = localStorage.getItem('pdfData');
            if (pdfData) {
              try {
                // Initialize a session for the example PDF
                const sessionResponse = await fetch('/api/papermap/initialize', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ pdfData })
                });
                
                if (sessionResponse.ok) {
                  const { sessionId, sessionData } = await sessionResponse.json();
                  // Store session data
                  if (sessionId) localStorage.setItem('pdfSessionId', sessionId);
                  if (sessionData) localStorage.setItem('pdfSessionData', sessionData);
                  console.log('Session automatically initialized for example PDF on first load');
                }
              } catch (error) {
                console.error('Failed to initialize session for example PDF on first load:', error);
              }
            }
          })
          .catch(error => console.error('Error pre-loading example PDF:', error));
      } else {
        // If PDF data exists but no session, initialize session
        const sessionId = localStorage.getItem('pdfSessionId');
        const sessionData = localStorage.getItem('pdfSessionData');
        
        if ((!sessionId || !sessionData) && existingPdfData) {
          console.log('PDF data exists but missing session data, initializing session');
          fetch('/api/papermap/initialize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pdfData: existingPdfData })
          })
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              throw new Error('Failed to initialize session');
            })
            .then(({ sessionId, sessionData }) => {
              if (sessionId) localStorage.setItem('pdfSessionId', sessionId);
              if (sessionData) localStorage.setItem('pdfSessionData', sessionData);
              console.log('Session initialized for existing example PDF data');
            })
            .catch(error => console.error('Error initializing session:', error));
        }
      }
    }
  }, [mindMapData, pdfUrl]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null); // Clear any previous error message
    setPdfUrl(null); // Clear the example PDF URL when new file is uploaded
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // When processing file uploads, add code to initialize a session
      // Process PDF directly without storing it in localStorage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        if (typeof base64data === 'string') {
          const base64Content = base64data.split(',')[1];
          
          // Clear any previous session data
          localStorage.removeItem('pdfSessionId');
          localStorage.removeItem('pdfSessionData');
          localStorage.removeItem('pdfData'); // Remove any old PDF data if it exists
          
          console.log('Processing PDF for mindmap generation, size:', base64Content.length);
          
          try {
            // First, create the mindmap with the API
            const mindmapResponse = await fetch('/api/papermap', {
              method: 'POST',
              body: formData
            });
            
            if (!mindmapResponse.ok) {
              throw new Error(`Error: ${mindmapResponse.status}`);
            }
            
            const mindmapData = await mindmapResponse.json();
            
            // Also initialize a session for follow-up questions
            const sessionResponse = await fetch('/api/papermap/initialize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ pdfData: base64Content })
            });
            
            if (sessionResponse.ok) {
              const { sessionId, sessionData } = await sessionResponse.json();
              // Store session data but not the PDF itself
              if (sessionId) localStorage.setItem('pdfSessionId', sessionId);
              if (sessionData) localStorage.setItem('pdfSessionData', sessionData);
              console.log('Session initialized for follow-up questions');
            }
            
            // Process the mindmap regardless of session initialization result
            if (mindmapData.error) {
              throw new Error(mindmapData.error);
            }
            
            // Process the mindmap data - existing code here
            setMindMapData(mindmapData);
            
            console.log('Creating flow from mindmap data');
            const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(mindmapData, updateNodeData);
            
            // Add the addFollowUpNode function to all nodes' data
            const nodesWithFollowUp = flowNodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                addFollowUpNode: stableAddFollowUpNode,
                deleteNode: stableDeleteNode, // Add deleteNode function
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
            
          } catch (error) {
            console.error('Error processing PDF:', error);
            setError(error instanceof Error ? error.message : 'Unknown error');
          } finally {
            // Make sure to set loading to false no matter what
            setLoading(false);
          }
        } else {
          setError('Failed to read file data');
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading the file');
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to analyze the paper');
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
      console.log('Updating node function references due to mindMapData change');
      
      // Create a map of parent to children for checking if nodes have children
      const parentToChildren: Record<string, boolean> = {};
      mindMapData.nodes.forEach((node: MindMapNode) => {
        if (node.parentId) {
          parentToChildren[node.parentId] = true;
        }
      });
      
      // Update all nodes with the current functions
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
              deleteNode: stableDeleteNode, // Add deleteNode function
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
  }, [mindMapData, nodes.length, stableAddFollowUpNode, stableDeleteNode, collapsedNodes, toggleChildrenVisibility, nodePositions]);

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

  // Function to cycle through layout options
  const cycleLayout = useCallback(() => {
    // Calculate the next layout index
    const nextLayoutIndex = (currentLayoutIndex + 1) % LAYOUT_PRESETS.length;
    setCurrentLayoutIndex(nextLayoutIndex);
    
    // Only apply new layout if mindMapData exists
    if (mindMapData) {
      // Create a new layout with the next layout preset
      const nextLayout = LAYOUT_PRESETS[nextLayoutIndex];
      const isChangingOrientation = 
        (LAYOUT_PRESETS[currentLayoutIndex].direction === 'LR' || LAYOUT_PRESETS[currentLayoutIndex].direction === 'RL') !==
        (nextLayout.direction === 'LR' || nextLayout.direction === 'RL');
        
      console.log(`Switching layout to: ${nextLayout.name} (${nextLayout.direction})`);
      if (isChangingOrientation) {
        console.log('Orientation changed: Repositioning handles and buttons');
      }
      
      try {
        const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
          mindMapData,
          updateNodeData,
          nextLayout
        );
        
        // Add the addFollowUpNode function to all nodes' data
        const nodesWithFollowUp = flowNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            addFollowUpNode: stableAddFollowUpNode,
            deleteNode: stableDeleteNode, // Add deleteNode function
            toggleChildrenVisibility
          }
        }));
        
        // Update nodes and edges with the new layout
        setNodes(nodesWithFollowUp);
        setEdges(flowEdges);
        
        // Reset node positions tracker since we've applied a completely new layout
        const newPositions: Record<string, NodePosition> = {};
        nodesWithFollowUp.forEach(node => {
          newPositions[node.id] = node.position;
        });
        setNodePositions(newPositions);
        
        // Center the view
        setTimeout(() => {
          if (reactFlowInstance.current) {
            reactFlowInstance.current.fitView({
              padding: 0.4,
              duration: 800,
              includeHiddenNodes: false
            });
          }
        }, 100);
      } catch (error) {
        console.error('Error applying new layout:', error);
      }
    }
  }, [currentLayoutIndex, mindMapData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility, updateNodeData]);

  // Effect to create initial flow when mindMapData is set
  useEffect(() => {
    if (mindMapData && nodes.length === 0) {
      console.log('Creating initial flow from mindMapData');
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(mindMapData, updateNodeData);
      
      // Add the addFollowUpNode function to all nodes' data
      const nodesWithFunctions = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode,
          deleteNode: stableDeleteNode, // Add deleteNode function
          toggleChildrenVisibility
        }
      }));
      
      setNodes(nodesWithFunctions);
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
  }, [mindMapData, nodes.length, updateNodeData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility]);

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

  // Delete a node and its connected edges
  const deleteNode = useCallback((nodeId: string) => {
    console.log(`Deleting node: ${nodeId}`);
    
    // Remove the node from the nodes state
    setNodes(currentNodes => currentNodes.filter(node => node.id !== nodeId));
    
    // Remove all edges connected to this node (both incoming and outgoing)
    setEdges(currentEdges => currentEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // Also update the mindMapData state
    if (mindMapData) {
      // Find the node to determine if it has children
      const nodeToDelete = mindMapData.nodes.find(node => node.id === nodeId);
      const childNodes = nodeToDelete ? mindMapData.nodes.filter(node => node.parentId === nodeId) : [];
      
      // Get the parent of the deleted node (if any)
      const parentNodeId = nodeToDelete?.parentId;
      
      // Update the mindMapData by removing the node
      setMindMapData(prevData => {
        if (!prevData) return null;
        
        // Create new nodes array without the deleted node
        let updatedNodes = prevData.nodes.filter(node => node.id !== nodeId);
        
        // Check if parent still has other children
        const parentHasOtherChildren = updatedNodes.some(
          node => node.parentId === parentNodeId && node.id !== nodeId
        );
        
        // For any child nodes, either orphan them or reconnect to grandparent
        if (childNodes.length > 0 && parentNodeId) {
          // Reconnect children to grandparent
          updatedNodes = updatedNodes.map(node => {
            if (node.parentId === nodeId) {
              return {
                ...node,
                parentId: parentNodeId
              };
            }
            return node;
          });
          
          // Update the edges in ReactFlow to reflect these changes
          childNodes.forEach(childNode => {
            // Create a unique edge ID by including a timestamp
            const uniqueEdgeId = `e-${parentNodeId}-${childNode.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Create new edge from grandparent to child
            const newEdge = {
              id: uniqueEdgeId,
              source: parentNodeId,
              target: childNode.id,
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
            
            // Add the new edge
            setEdges(currentEdges => [...currentEdges, newEdge]);
          });
        }
        
        return {
          ...prevData,
          nodes: updatedNodes
        };
      });
      
      // Update any nodes that need to have their hasChildren property updated
      if (parentNodeId) {
        setNodes(currentNodes => {
          return currentNodes.map(node => {
            if (node.id === parentNodeId) {
              // Check if parent still has other children
              const parentStillHasChildren = currentNodes.some(n => 
                n.id !== nodeId && 
                n.data.parentId === parentNodeId
              );
              
              return {
                ...node,
                data: {
                  ...node.data,
                  hasChildren: parentStillHasChildren
                }
              };
            }
            return node;
          });
        });
      }
    }
    
    // Handle collapsed nodes state if necessary
    setCollapsedNodes(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(nodeId)) {
        newCollapsed.delete(nodeId);
      }
      return newCollapsed;
    });
    
    // After deletion, run node visibility update
    setTimeout(() => {
      updateNodeVisibility();
    }, 50);
    
  }, [mindMapData, updateNodeVisibility]);

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
    deleteNode: stableDeleteNode, // Add deleteNode to the returned object
    handleResetView,
    loadExampleMindMap, // Expose the function to load example mindmap
    pdfUrl, // Expose the PDF URL
    currentLayoutIndex,
    setCurrentLayoutIndex,
    cycleLayout
  };
} 