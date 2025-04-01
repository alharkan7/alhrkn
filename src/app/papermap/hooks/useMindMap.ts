'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, useNodesState, useEdgesState, NodeChange, NodePositionChange } from 'reactflow';
import { MindMapData, NodePosition, MindMapNode, COLUMN_WIDTH } from '../types';
import { createMindMapLayout, updateMindMapLayout, LAYOUT_PRESETS, getDefaultLayoutIndex } from '../types';
import { EXAMPLE_MINDMAP, EXAMPLE_PDF_URL } from '../data/sampleMindmap';

export function useMindMap() {
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(EXAMPLE_MINDMAP); // Initialize with example data
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(EXAMPLE_PDF_URL); // Initialize with example PDF URL
  
  // Initialize with a default value first for SSR
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState<number>(0);
  const currentLayout = LAYOUT_PRESETS[currentLayoutIndex]; // Current layout options
  
  // Store example PDF URL in localStorage only if there's no existing blob URL
  useEffect(() => {
    // Check if there's already a blob URL stored (from a previous upload)
    const existingBlobUrl = localStorage.getItem('pdfBlobUrl');
    
    // Only set the example PDF URL if there's no existing blob URL
    if (!existingBlobUrl) {
    localStorage.setItem('pdfBlobUrl', EXAMPLE_PDF_URL);
      console.log('Stored initial example PDF URL in localStorage (no existing blob URL):', EXAMPLE_PDF_URL);
    } else {
      console.log('Kept existing blob URL in localStorage:', existingBlobUrl);
    }
  }, []);
  
  // Update layout based on device type after mounting on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentLayoutIndex(getDefaultLayoutIndex());
    }
  }, []);
  
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
        stroke: '#3182CE', // Bright blue that matches our palette
        strokeWidth: 1.5, 
        strokeOpacity: 0.8, 
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
    console.log('Loading example mindmap and PDF...');
    
    // Clean up any existing session
    const existingSessionId = localStorage.getItem('currentSessionId');
    if (existingSessionId) {
      // Send cleanup request to the server
      fetch('/api/papermap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: existingSessionId,
          cleanupSession: true
        }),
      }).catch(e => console.error('Error cleaning up session:', e));
    }
    
    // Reset to example data
    setMindMapData(EXAMPLE_MINDMAP);
    setPdfUrl(EXAMPLE_PDF_URL);
    setError(null);
    
    // Store the example PDF URL in localStorage for follow-up questions
    try {
      localStorage.setItem('pdfBlobUrl', EXAMPLE_PDF_URL);
      console.log('Stored example PDF URL in localStorage:', EXAMPLE_PDF_URL);
      
      // IMPORTANT: Set the userHasUploadedPdf flag to false when loading the example
      localStorage.setItem('userHasUploadedPdf', 'false');
      // Clear any existing session ID
      localStorage.removeItem('currentSessionId');
      console.log('Reset userHasUploadedPdf flag to false for example mindmap');
    } catch (storageError) {
      console.warn('Storage issue when setting example PDF URL, but continuing:', storageError);
    }
    
    // Clear any existing flow state
    setNodes([]);
    setEdges([]);
    setNodePositions({});
    setCollapsedNodes(new Set());
    
    try {
      console.log('Creating layout for example mindmap');
      // Get current layout options based on device/screen size
      const currentLayoutOptions = LAYOUT_PRESETS[currentLayoutIndex];
      console.log(`Using layout: ${currentLayoutOptions.name} with direction: ${currentLayoutOptions.direction}`);
      
      // Generate layout with enhanced positioning algorithm
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
        EXAMPLE_MINDMAP, 
        updateNodeData, 
        currentLayoutOptions
      );
      
      // Add the addFollowUpNode function to all nodes' data
      // Ensure each node has the correct layout direction explicitly set
      const nodesWithFollowUp = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode,
          deleteNode: stableDeleteNode,
          toggleChildrenVisibility,
          // Explicitly set layoutDirection here rather than letting it be inherited later
          layoutDirection: currentLayoutOptions.direction
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
  }, [updateNodeData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility, currentLayoutIndex, setNodes, setEdges, setMindMapData, setPdfUrl, setError]);

  // Generate initial mindmap for uploaded PDF
  const generateInitialMindMap = useCallback(async (fileName: string, pdfBlobUrl: string) => {
    console.log('Generating initial mindmap for uploaded PDF:', fileName);
    // We don't set loading state here anymore - it's managed by the parent function
    setError(null);
    
    try {
      // Call the API with the blob URL to generate a mindmap
      const response = await fetch('/api/papermap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          blobUrl: pdfBlobUrl,
          fileName: fileName
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF');
      }
      
      const data = await response.json();
      
      if (data && data.mindmap && typeof data.mindmap === 'object') {
        console.log('Mind map data received:', data.mindmap);
               
        // Update the mind map data
        setMindMapData(data.mindmap);
        
        // Store the session ID in localStorage for follow-up questions
        if (data.sessionId) {
          try {
            localStorage.setItem('currentSessionId', data.sessionId);
            console.log('Stored session ID in localStorage:', data.sessionId);
          } catch (storageError) {
            console.warn('Failed to store session ID in localStorage:', storageError);
          }
        }
        
        // DEBUG: Verify the blob URL is still correctly set in localStorage after all operations
        const finalBlobUrl = localStorage.getItem('pdfBlobUrl');
        console.log('Final blob URL in localStorage after all operations:', finalBlobUrl);
      } else {
        throw new Error('Invalid mind map data received');
    }
    
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
      
      return true;
    } catch (err) {
      console.error('Error generating mindmap:', err);
      throw err; // Re-throw to allow the parent function to handle
    }
  }, [setMindMapData, setError]);

  // Handle file upload for PDF
  const handleFileUpload = useCallback(async (file: File, blobUrl?: string) => {
    if (!file) return;
    
    console.log('Starting file upload for:', file.name);
    setFileLoading(true);
    setUploadError(null);
    
    try {
      // Check if the file is a PDF
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are supported');
      }
      
      // Clean up any existing session
      const existingSessionId = localStorage.getItem('currentSessionId');
      if (existingSessionId) {
        // Send cleanup request to the server
        fetch('/api/papermap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: existingSessionId,
            cleanupSession: true
          }),
        }).catch(e => console.error('Error cleaning up session:', e));
      }
         
      // Clear previous session data for this new PDF
      // Session IDs/data are specific to each PDF, so they need to be recreated
      localStorage.removeItem('pdfSessionId');
      localStorage.removeItem('pdfSessionData');
      localStorage.removeItem('currentSessionId'); // Clear the session ID for the new PDF
      
      // Check if the example PDF URL is stored and remove it
      const existingPdfUrl = localStorage.getItem('pdfBlobUrl');
      const isExamplePdf = existingPdfUrl && existingPdfUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf');
      
      if (isExamplePdf) {
        console.log('Removing example PDF URL from localStorage');
        localStorage.removeItem('pdfBlobUrl');
      }
      
      // Set the user has uploaded PDF flag
      try {
        localStorage.setItem('userHasUploadedPdf', 'true');
      } catch (error) {
        console.warn('Failed to set userHasUploadedPdf flag, but continuing anyway');
      }
      
      // Start with the blob URL if provided, otherwise it will be set during upload
      let uploadedBlobUrl: string;
      
      // Only upload if no blob URL was provided
      if (!blobUrl) {
        // Get the file data as a blob
        const fileData = new FormData();
        fileData.append('file', file);
        
        // Upload the file to Vercel Blob storage
        const upload = await fetch('/api/papermap/blob-upload', {
          method: 'POST',
          body: fileData,
        });
        
        if (!upload.ok) {
          const errorDetails = await upload.text();
          console.error('Upload failed:', errorDetails);
          throw new Error(`Upload failed: ${upload.status} ${upload.statusText}`);
        }
        
        const { url } = await upload.json();
        
        if (!url) {
          throw new Error('No blob URL returned from upload');
        }
        
        uploadedBlobUrl = url;
        console.log('File uploaded successfully to Vercel Blob:', 
          uploadedBlobUrl.substring(0, 50) + '...');
      } else {
        uploadedBlobUrl = blobUrl;
        console.log('Using provided blob URL:', uploadedBlobUrl.substring(0, 50) + '...');
      }
      
      // CRUCIAL: Store the blob URL in localStorage for cross-page persistence
      try {
        localStorage.setItem('pdfBlobUrl', uploadedBlobUrl);
        // Store with a more specific key for follow-up questions
        localStorage.setItem('currentPdfBlobUrl', uploadedBlobUrl);
        
        // Double-check it was set correctly
        const storedBlobUrl = localStorage.getItem('pdfBlobUrl');
        console.log('Stored blob URL in localStorage:', 
          storedBlobUrl ? (storedBlobUrl.substring(0, 50) + '...') : 'FAILED TO STORE');
      } catch (storageError) {
        console.warn('Failed to store blob URL in localStorage but continuing with session init');
      }
      
      // Update the application state with the blob URL
      setPdfUrl(uploadedBlobUrl);
      
      console.log('PDF upload and session initialization complete');
      
      // Triple-check that we didn't somehow revert to the example PDF
      const finalBlobUrl = localStorage.getItem('pdfBlobUrl');
      if (finalBlobUrl && finalBlobUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf')) {
        console.warn('Example PDF URL found in localStorage after uploading user PDF - will try to fix');
        try {
          localStorage.setItem('pdfBlobUrl', uploadedBlobUrl);
        } catch (e) {
          console.error('Failed to reset blob URL but continuing anyway');
        }
      }
      
      // Clear any previous mindmap data when a new PDF is uploaded
      setMindMapData(null);
      setNodes([]);
      setEdges([]);
      setNodePositions({});
      setCollapsedNodes(new Set());
      
      // Before generating mindmap, set loading true to ensure the loading indicator appears
      setLoading(true);
      
      try {
        // Generate a new mindmap for the uploaded PDF
        await generateInitialMindMap(file.name, uploadedBlobUrl);
      } catch (mindmapError) {
        console.error('Error generating mindmap:', mindmapError);
        setError(mindmapError instanceof Error ? mindmapError.message : 'Failed to generate mindmap');
      } finally {
        // Ensure loading state is reset regardless of mindmap generation outcome
        setLoading(false);
      }
      
      return uploadedBlobUrl;
    } catch (error) {
      console.error('Error handling file upload:', error);
      setUploadError(error instanceof Error ? error : new Error('Unknown upload error'));
      setError(error instanceof Error ? error.message : 'Failed to upload PDF');
      return null;
    } finally {
      setFileLoading(false);
    }
  }, [generateInitialMindMap, setPdfUrl, setMindMapData]);

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
              pageNumber: node.data.pageNumber !== undefined ? node.data.pageNumber : mindMapNode?.pageNumber,
              // Preserve layoutDirection if it exists
              layoutDirection: node.data.layoutDirection
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
        // Generate the layout with enhanced positioning algorithm
        const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
          mindMapData,
          updateNodeData,
          nextLayout
        );
        
        // Add the addFollowUpNode function to all nodes' data
        // Ensure each node has the correct layout direction explicitly set
        const nodesWithFollowUp = flowNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            addFollowUpNode: stableAddFollowUpNode,
            deleteNode: stableDeleteNode,
            toggleChildrenVisibility,
            // Explicitly set layoutDirection to ensure correct handle positioning
            layoutDirection: nextLayout.direction
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
      
      // Get the current layout options based on device/screen size
      const currentLayoutOptions = LAYOUT_PRESETS[currentLayoutIndex];
      console.log(`Using initial layout: ${currentLayoutOptions.name} with direction: ${currentLayoutOptions.direction}`);
      
      // Generate the initial layout with enhanced positioning algorithm
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
        mindMapData, 
        updateNodeData, 
        currentLayoutOptions
      );
      
      // Add the addFollowUpNode function to all nodes' data
      // Ensure each node has the correct layout direction explicitly set
      const nodesWithFunctions = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode,
          deleteNode: stableDeleteNode,
          toggleChildrenVisibility,
          // Explicitly set layoutDirection to ensure correct handle positioning
          layoutDirection: currentLayoutOptions.direction
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
  }, [mindMapData, nodes.length, updateNodeData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility, currentLayoutIndex]);

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
                stroke: '#3182CE', // Bright blue that matches our palette
                strokeWidth: 1.5, 
                strokeOpacity: 0.8, 
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

  // Generate initial nodes and edges whenever mindMapData changes
  useEffect(() => {
    if (mindMapData && !loading) {
      console.log('Generating new flow from updated mindMapData:', mindMapData);
      
      // Get current layout options based on device/screen size
      const currentLayoutOptions = LAYOUT_PRESETS[currentLayoutIndex];
      console.log(`Using layout: ${currentLayoutOptions.name} with direction: ${currentLayoutOptions.direction}`);
      
      // Generate the initial layout with enhanced positioning
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
        mindMapData, 
        updateNodeData,
        currentLayoutOptions
      );
      
      // Add the addFollowUpNode function to all nodes' data
      // Ensure each node has the correct layout direction set
      const nodesWithFollowUp = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode,
          deleteNode: stableDeleteNode, 
          toggleChildrenVisibility,
          // Explicitly set layoutDirection here rather than letting it be inherited later
          layoutDirection: currentLayoutOptions.direction 
        }
      }));
      
      setNodes(nodesWithFollowUp);
      setEdges(flowEdges);
      
      // Only fit view if this is an initial load (nodes.length was 0) or layout change
      if (nodes.length === 0) {
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
    }
  }, [mindMapData, currentLayoutIndex, loading, updateNodeData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility, setNodes, setEdges, nodes.length]);

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
    deleteNode: stableDeleteNode,
    handleResetView,
    loadExampleMindMap,
    pdfUrl,
    currentLayoutIndex,
    setCurrentLayoutIndex,
    cycleLayout
  };
} 