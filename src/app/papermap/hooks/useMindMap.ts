'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, useNodesState, useEdgesState, NodeChange, NodePositionChange } from 'reactflow';
import { MindMapData, NodePosition, MindMapNode, COLUMN_WIDTH } from '../types';
import { createMindMapLayout, updateMindMapLayout, LAYOUT_PRESETS, getDefaultLayoutIndex } from '../types';
import { EXAMPLE_MINDMAP, EXAMPLE_PDF_URL } from '../data/sampleMindmap';

export function useMindMap() {
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'uploading' | 'processing' | 'building' | null>(null);
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
  
  // Refs to help prevent infinite state update loops
  const previousLayoutIndexRef = useRef<number>(0);
  const positionsToApplyRef = useRef<Record<string, NodePosition>>({});
  
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
    } else {
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
    
    // Also update the mindMapData but using a flag to indicate this is just a content update
    // not a structural change, to prevent unnecessary layout recalculation
    if (mindMapData) {
      const updatedMindMapData = {
        ...mindMapData,
        nodes: mindMapData.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              title: newData.title ?? n.title,
              description: newData.description ?? n.description,
              __contentOnlyUpdate: true // Flag to indicate this update shouldn't trigger layout recalculation
            };
          }
          return n;
        }),
        __contentOnlyUpdate: true // Add a flag at the root level too
      };
      
      // Use setTimeout to break potential update cycles
      setTimeout(() => {
        setMindMapData(updatedMindMapData);
      }, 0);
    }
  }, [mindMapData, setNodes, toggleChildrenVisibility]);

  // Add a new follow-up node
  const addFollowUpNode = (parentId: string, question: string, answer: string, customNodeId?: string): string => {
    
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

    
    // Get the latest positions of all nodes from ReactFlow instance
    const currentNodePositions: Record<string, NodePosition> = {};
    if (reactFlowInstance.current) {
      try {
        const currentNodes = reactFlowInstance.current.getNodes();
        currentNodes.forEach((node: { id: string; position: NodePosition }) => {
          currentNodePositions[node.id] = node.position;
        });
      } catch (error) {
        console.warn('Could not get node positions from reactFlowInstance:', error);
      }
    }
    
    // Find the parent node with the CURRENT position (which may have been moved)
    let currentParentPos: NodePosition | null = null;
    
    // First check if we have a position from reactFlowInstance
    if (currentNodePositions[parentId]) {
      currentParentPos = currentNodePositions[parentId];
    } else {
      // Fall back to finding the node in nodes state
      const parentFlowNode = nodes.find(node => node.id === parentId);
      if (!parentFlowNode) {
        console.error(`Cannot add follow-up node: parent ReactFlow node with id ${parentId} not found`);
        return newNodeId;
      }
      currentParentPos = parentFlowNode.position;
    }
    
    if (!currentParentPos) {
      console.error(`Cannot determine position for parent node ${parentId}`);
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
    
    // Find existing child nodes of this parent to avoid overlaps
    const siblingNodes = nodes.filter(node => {
      const nodeData = mindMapData.nodes.find(n => n.id === node.id);
      return nodeData && nodeData.parentId === parentId;
    });
    
    // Calculate spacing offset based on number of siblings
    const siblingCount = siblingNodes.length;
    const offsetMultiplier = siblingCount > 0 ? siblingCount : 0;
    const siblingSpacing = 30; // Spacing between sibling nodes
    
    // Calculate position based on layout direction and existing siblings
    const isHorizontalLayout = !currentLayout?.direction || 
                              currentLayout.direction === 'LR' || 
                              currentLayout.direction === 'RL';
    
    const newNodePosition = { 
      x: currentParentPos.x + (isHorizontalLayout ? COLUMN_WIDTH : offsetMultiplier * siblingSpacing), 
      y: currentParentPos.y + (isHorizontalLayout ? offsetMultiplier * siblingSpacing : COLUMN_WIDTH)
    };
    
    // Store the ID of the last created node in all nodes' data for reference
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
    
    // Store the positions that we want to set, but use setTimeout to avoid circular updates
    const positionsToSet = {
      ...currentNodePositions,
      [newNodeId]: newNodePosition
    };
    
    // Update nodes and edges - use functional updates to ensure latest state
    setNodes(currentNodes => {
      // Map through current nodes and update their positions from reactFlowInstance
      const nodesWithUpdatedPositions = currentNodes.map(node => {
        if (currentNodePositions[node.id]) {
          // Use the position from reactFlowInstance
          return {
            ...node,
            position: currentNodePositions[node.id]
          };
        }
        return node;
      });
      
      // Add the new node
      const updatedNodes = [...nodesWithUpdatedPositions, newFlowNode];
      
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
    
    // Now update mindMapData, but use a flag to indicate this was a node addition
    // to prevent unnecessary layout recalculation
    const updatedMindMapData = {
      ...mindMapData,
      nodes: [...mindMapData.nodes, newNode],
      __nodeAddition: true  // Special flag to indicate this is a node addition
    };
    
    // Update mindMapData
    setMindMapData(updatedMindMapData);
    
    // Use setTimeout to break potential update cycles when updating nodePositions
    setTimeout(() => {
      setNodePositions(prev => ({
        ...prev,
        ...positionsToSet
      }));
    }, 50);
    
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
    // Always call the latest implementation from the ref
    const nodeId = addFollowUpNodeRef.current(parentId, question, answer, customNodeId);
    return nodeId || customNodeId || ''; // Ensure we always return a string
  }, []);

  // Create a stable function for deleteNode
  const stableDeleteNode = useCallback((nodeId: string) => {
    // Always call the latest implementation from the ref
    deleteNodeRef.current(nodeId);
  }, []);

  // Function to load example mindmap
  const loadExampleMindMap = useCallback(() => {
    setLoading(true);
    
    // Clean up previous chat history
    localStorage.removeItem('chatHistory');
    
    // Reset to example data
    setMindMapData(EXAMPLE_MINDMAP);
    setPdfUrl(EXAMPLE_PDF_URL);
    setError(null);
    
    // Store the example PDF URL in localStorage for follow-up questions
    try {
      localStorage.setItem('pdfBlobUrl', EXAMPLE_PDF_URL);
      
      // IMPORTANT: Set the userHasUploadedPdf flag to false when loading the example
      localStorage.setItem('userHasUploadedPdf', 'false');
    } catch (storageError) {
      console.warn('Storage issue when setting example PDF URL, but continuing:', storageError);
    }
    
    // Clear any existing flow state
    setNodes([]);
    setEdges([]);
    setNodePositions({});
    setCollapsedNodes(new Set());
    
    try {
      // Get current layout options based on device/screen size
      const currentLayoutOptions = LAYOUT_PRESETS[currentLayoutIndex];
      
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
    // We don't set loading state here anymore - it's managed by the parent function
    setError(null);
    setLoadingStage('processing');
    
    try {
      // Call the API with the blob URL to generate a mindmap
      const response = await fetch('/api/papermap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          blobUrl: pdfBlobUrl,
          fileName: fileName,
          chatHistory: [] // Start with empty chat history for a new mindmap
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF');
      }
      
      const data = await response.json();
      
      setLoadingStage('building');
      
      if (data && data.mindmap && typeof data.mindmap === 'object') {
               
        // Update the mind map data
        setMindMapData(data.mindmap);
        
        // Store the chat history in localStorage for follow-up questions
        if (data.chatHistory) {
          try {
            // Ensure we're storing correct role format for chat history
            const formattedChatHistory = data.chatHistory.map((msg: any) => ({
              ...msg,
              role: msg.role === 'assistant' ? 'model' : msg.role
            }));
            
            localStorage.setItem('chatHistory', JSON.stringify(formattedChatHistory));
          } catch (storageError) {
            console.warn('Failed to store chat history in localStorage:', storageError);
          }
        }
        
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
    
    setFileLoading(true);
    setUploadError(null);
    setLoadingStage('uploading');
    
    try {
      // Check if the file is a PDF
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are supported');
      }
      
      // Clear previous chat history
      localStorage.removeItem('chatHistory');
         
      // Clear previous session data for this new PDF
      localStorage.removeItem('pdfSessionId');
      localStorage.removeItem('pdfSessionData');
      
      // Check if the example PDF URL is stored and remove it
      const existingPdfUrl = localStorage.getItem('pdfBlobUrl');
      const isExamplePdf = existingPdfUrl && existingPdfUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf');
      
      if (isExamplePdf) {
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
        // Using direct upload from client to Vercel Blob
        try {
          const { upload } = await import('@vercel/blob/client');
          
          const blob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/papermap/blob',
          });
          
          if (!blob.url) {
            throw new Error('No blob URL returned from upload');
          }
          
          uploadedBlobUrl = blob.url;
        } catch (uploadError) {
          console.error('Error uploading to Blob:', uploadError);
          throw new Error('Failed to upload PDF file');
        }
      } else {
        uploadedBlobUrl = blobUrl;
      }
      
      // CRUCIAL: Store the blob URL in localStorage for cross-page persistence
      try {
        localStorage.setItem('pdfBlobUrl', uploadedBlobUrl);
        // Store with a more specific key for follow-up questions
        localStorage.setItem('currentPdfBlobUrl', uploadedBlobUrl);
        
        // Double-check it was set correctly
        const storedBlobUrl = localStorage.getItem('pdfBlobUrl');
      } catch (storageError) {
        console.warn('Failed to store blob URL in localStorage but continuing with session init');
      }
      
      // Update the application state with the blob URL
      setPdfUrl(uploadedBlobUrl);
          
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
      setLoadingStage('processing');
      
      try {
        // Generate a new mindmap for the uploaded PDF
        await generateInitialMindMap(file.name, uploadedBlobUrl);
      } catch (mindmapError) {
        console.error('Error generating mindmap:', mindmapError);
        setError(mindmapError instanceof Error ? mindmapError.message : 'Failed to generate mindmap');
      } finally {
        // Ensure loading state is reset regardless of mindmap generation outcome
        setLoading(false);
        setLoadingStage(null);
      }
      
      return uploadedBlobUrl;
    } catch (error) {
      console.error('Error handling file upload:', error);
      setUploadError(error instanceof Error ? error : new Error('Unknown upload error'));
      setError(error instanceof Error ? error.message : 'Failed to upload PDF');
      return null;
    } finally {
      setFileLoading(false);
      if (loading) {
        setLoadingStage(null);
      }
    }
  }, [generateInitialMindMap, setPdfUrl, setMindMapData]);

  // Update node visibility when collapsed nodes or mindMapData change
  useEffect(() => {
    updateNodeVisibility();
  }, [collapsedNodes, mindMapData, updateNodeVisibility]);

  // Force update node handlers when mindMapData changes
  useEffect(() => {
    if (mindMapData && nodes.length > 0) {
      
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
      
      // Get the current layout options based on device/screen size
      const currentLayoutOptions = LAYOUT_PRESETS[currentLayoutIndex];
      
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
      
      // Check if this is just a content update that should not trigger layout recalculation
      const isContentOnlyUpdate = mindMapData.__contentOnlyUpdate === true;
      
      // Check if this is a node addition operation (handled separately in addFollowUpNode)
      const isNodeAddition = mindMapData.__nodeAddition === true;
      
      if (isContentOnlyUpdate) {
        
        // For content updates, just update the data in the existing nodes without changing positions
        setNodes(currentNodes => 
          currentNodes.map(node => {
            // Find the corresponding node in mindMapData to get updated content
            const mindMapNode = mindMapData.nodes.find(n => n.id === node.id);
            
            if (mindMapNode) {
              return {
                ...node,
                // Preserve current position
                position: node.position,
                data: {
                  ...node.data,
                  // Update only content properties
                  title: mindMapNode.title,
                  description: mindMapNode.description,
                  // Preserve other data properties
                  addFollowUpNode: stableAddFollowUpNode,
                  deleteNode: stableDeleteNode, 
                  toggleChildrenVisibility,
                  // Preserve layout direction
                  layoutDirection: node.data.layoutDirection
                }
              };
            }
            return node;
          })
        );
        
        // Early return to skip the rest of the layout calculation
        return;
      }
      
      // If this is a node addition, we've already handled it in addFollowUpNode
      if (isNodeAddition) {
        return;
      }
      
      // Get current layout options based on device/screen size
      const currentLayoutOptions = LAYOUT_PRESETS[currentLayoutIndex];
      
      // PRESERVE CURRENT POSITIONS: First get all current node positions from ReactFlow before any update
      const currentNodePositions: Record<string, NodePosition> = {};
      if (reactFlowInstance.current && nodes.length > 0) {
        try {
          const flowNodes = reactFlowInstance.current.getNodes();
          flowNodes.forEach((node: { id: string; position: NodePosition }) => {
            currentNodePositions[node.id] = node.position;
          });
        } catch (error) {
          console.warn('Could not get node positions from reactFlowInstance:', error);
        }
      }
      
      // Generate the initial layout with enhanced positioning
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
        mindMapData, 
        updateNodeData,
        currentLayoutOptions
      );
      
      // Add the addFollowUpNode function to all nodes' data
      // Ensure each node has the correct layout direction set
      const nodesWithFunctions = flowNodes.map(node => {
        // Check if we have a current position for this node and use it
        const existingPosition = 
          // First check reactFlowInstance positions (most up-to-date)
          currentNodePositions[node.id] || 
          // Then fallback to nodePositions state (might be slightly outdated)
          nodePositions[node.id];
        
        return {
          ...node,
          // Preserve current position if it exists
          ...(existingPosition ? { position: existingPosition } : {}),
          data: {
            ...node.data,
            addFollowUpNode: stableAddFollowUpNode,
            deleteNode: stableDeleteNode, 
            toggleChildrenVisibility,
            // Explicitly set layoutDirection here rather than letting it be inherited later
            layoutDirection: currentLayoutOptions.direction 
          }
        };
      });
      
      // If this is not the initial load, update the nodePositions state with current positions
      // IMPORTANT FIX: Only update nodePositions if the update wasn't triggered by a nodePositions change
      const isLayoutChange = currentLayoutIndex !== previousLayoutIndexRef.current;
      const isInitialLoad = nodes.length === 0;
      
      // Keep track of the previous layout index
      previousLayoutIndexRef.current = currentLayoutIndex;
      
      if ((isLayoutChange || isInitialLoad) && nodes.length > 0) {
        // Store current positions for later use, but avoid triggering this effect again
        // by setting nodePositions only when necessary
        positionsToApplyRef.current = { ...currentNodePositions };
        
        // Use setTimeout to avoid the circular dependency in the effect
        setTimeout(() => {
          setNodePositions(prev => ({
            ...prev,
            ...positionsToApplyRef.current
          }));
          // Clear the ref after applying
          positionsToApplyRef.current = {};
        }, 0);
      }
      
      setNodes(nodesWithFunctions);
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
  // IMPORTANT: Remove nodePositions from the dependency array to prevent circular updates
  }, [mindMapData, currentLayoutIndex, loading, updateNodeData, stableAddFollowUpNode, stableDeleteNode, toggleChildrenVisibility, setNodes, setEdges, nodes.length]);

  return {
    loading,
    loadingStage,
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