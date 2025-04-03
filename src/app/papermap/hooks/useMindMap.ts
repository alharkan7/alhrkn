'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Node, Edge, useNodesState, useEdgesState, NodeChange, NodePositionChange, ReactFlowJsonObject } from 'reactflow';
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
  const [fileName, setFileName] = useState<string>('mindmap'); // Initialize with a default file name
  
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

    // Add a new follow-up node
  const addFollowUpNode = (parentId: string, question: string, answer: string, customNodeId?: string): string => {
    
    // Validate inputs to prevent errors
    if (!parentId || typeof parentId !== 'string') {
      console.log('Invalid parent ID provided to addFollowUpNode, using default');
      parentId = 'root'; // Use a default parent ID to avoid errors
    }
    
    // Generate a unique ID for the new node or use the provided ID
    const newNodeId = customNodeId || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find the parent node to determine the level
    if (!mindMapData) {
      console.error("Cannot add follow-up node: mindMapData is null");
      return newNodeId;
    }
    
    let parentMindMapNode = mindMapData.nodes.find(node => node.id === parentId);
    if (!parentMindMapNode) {
      // Silent fix for QnA nodes: Instead of showing an error, try to find the node in ReactFlow nodes
      // and create a placeholder entry in mindMapData for this node
      const parentFlowNode = nodes.find(node => node.id === parentId);
      if (parentFlowNode) {
        // Find the parent's parent to determine the level
        const grandparentId = parentFlowNode.data.parentId;
        let level = 1; // Default level if we can't determine
        
        if (grandparentId) {
          const grandparent = mindMapData.nodes.find(node => node.id === grandparentId);
          if (grandparent) {
            level = grandparent.level + 1;
          }
        }
        
        // Create a placeholder entry in mindMapData for this node
        const placeholderNode = {
          id: parentId,
          title: parentFlowNode.data.title || '',
          description: parentFlowNode.data.description || '',
          parentId: grandparentId || null,
          level: level,
          type: 'qna' as 'regular' | 'qna'
        };
        
        // Add the placeholder node to mindMapData
        mindMapData.nodes.push(placeholderNode);
        
        // Now retry finding the parent
        parentMindMapNode = mindMapData.nodes.find(node => node.id === parentId);
        if (!parentMindMapNode) {
          // Still can't find it after adding placeholder - this should never happen,
          // but handle it gracefully
          console.log(`Added placeholder for node ${parentId} but still not found. Using defaults.`);
          // Create a fallback node to avoid errors and allow operation to continue
          parentMindMapNode = {
            id: parentId,
            title: parentFlowNode.data.title || '',
            description: parentFlowNode.data.description || '',
            parentId: null,
            level: 1,
            type: 'qna' as 'regular' | 'qna'
          };
        }
      } else {
        // If we can't find the node in ReactFlow either, this is a real error
        // but we'll handle it gracefully to avoid breaking the UI
        console.log(`Node with ID ${parentId} not found in ReactFlow or mindMapData. Using fallback.`);
        parentMindMapNode = {
          id: parentId,
          title: 'Unknown Node',
          description: '',
          parentId: null,
          level: 1,
          type: 'regular' as 'regular' | 'qna'
        };
      }
    }

    // Find parent FlowNode to access its data
    const parentFlowNode = nodes.find(node => node.id === parentId);
    const parentPageNumber = parentFlowNode?.data?.pageNumber;
    const parentOpenPdfViewer = parentFlowNode?.data?.openPdfViewer;

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
        console.log(`Cannot find position for node ${parentId}. Using default positioning.`);
        // Use a default position rather than failing
        currentParentPos = { x: 100, y: 100 };
      } else {
        currentParentPos = parentFlowNode.position;
      }
    }
    
    if (!currentParentPos) {
      console.log(`Cannot determine position for parent node ${parentId}. Using default.`);
      currentParentPos = { x: 100, y: 100 }; // Default position to avoid failure
    }
    
    // Create the new node with question as title and answer as description
    const isBlankNode = question === 'Double Click to Edit' && answer === 'Double-click to add a description';
    const nodeType = isBlankNode ? 'blank' as const : 'qna' as const;
    
    const newNode = {
      id: newNodeId,
      title: question,
      description: answer,
      parentId: parentId,
      level: parentMindMapNode.level + 1,
      type: nodeType, // Set nodeType based on content
      pageNumber: parentPageNumber,
      openPdfViewer: parentOpenPdfViewer
    };
    
    // Find existing child nodes of this parent to avoid overlaps
    const siblingNodes = nodes.filter(node => {
      // Changed this to avoid potential errors when node isn't in mindMapData
      try {
        const nodeData = mindMapData.nodes.find(n => n.id === node.id);
        return nodeData && nodeData.parentId === parentId;
      } catch (e) {
        return false; // Safely handle any errors
      }
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
        addFollowUpNode: addFollowUpNodeRef.current,
        deleteNode: deleteNodeRef.current,
        // Set nodeType based on content
        nodeType: nodeType,
        expanded: true, // Expand all nodes by default
        lastCreatedNodeId,
        hasChildren: false,
        childrenCollapsed: false,
        toggleChildrenVisibility,
        width: 256,
        pageNumber: parentPageNumber,
        openPdfViewer: parentOpenPdfViewer,
        layoutDirection: currentLayout?.direction
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
    // Consolidate node updates
    setNodes(currentNodes => {
      // Map through current nodes and update their positions from reactFlowInstance (if available)
      const nodesWithUpdatedPositions = currentNodes.map(node => {
        const currentPosition = currentNodePositions[node.id];
        return currentPosition ? { ...node, position: currentPosition } : node;
      });

      // Find the parent node to update its hasChildren status
      const parentIndex = nodesWithUpdatedPositions.findIndex(node => node.id === parentId);
      if (parentIndex !== -1) {
        nodesWithUpdatedPositions[parentIndex] = {
          ...nodesWithUpdatedPositions[parentIndex],
          data: {
            ...nodesWithUpdatedPositions[parentIndex].data,
            hasChildren: true,
            // Ensure children are not collapsed when adding a new one
            childrenCollapsed: false
          }
        };
      }
      
      // Add the new node (remove direct style manipulation for highlighting)
      const finalNewFlowNode = {
        ...newFlowNode,
        style: { // Basic styles, QnA styling handled in CustomNode
            border: '2px solid #bfdbfe', // QnA node border color
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
        },
        className: 'node-card' // Rely on CustomNode for 'updating' class via its useEffect
      };

      // Return updated nodes array including the new one
      return [...nodesWithUpdatedPositions, finalNewFlowNode];
    });

    setEdges(currentEdges => {
      const updatedEdges = [...currentEdges, newEdge];
      return updatedEdges;
    });

    // Create a copy of the existing mindMapData to avoid mutation issues
    const updatedMindMapData = { 
      ...(mindMapData || { nodes: [] }), 
      nodes: [...(mindMapData?.nodes || []), newNode],
      __nodeAddition: true  // Special flag to indicate this is a node addition
    };
    
    // Update the mindMapData state with the new node
    setMindMapData(updatedMindMapData);

    // Use setTimeout to break potential update cycles when updating nodePositions
    setTimeout(() => {
      setNodePositions(prev => ({
        ...prev,
        ...positionsToSet // Use the positions calculated earlier
      }));
    }, 0); // Use 0 timeout for minimal delay

    // Return the node ID for reference
    return newNodeId;
  };
  
  // Create a ref to hold the latest addFollowUpNode implementation
  const addFollowUpNodeRef = useRef<(parentId: string, question: string, answer: string, customNodeId?: string) => string>((parentId, question, answer, customNodeId) => {
    console.error("addFollowUpNode called before initialization");
    return customNodeId || '';
  });

  // Add deleteNode reference 
  const deleteNodeRef = useRef<(nodeId: string) => void>((nodeId) => {
    console.error("deleteNode called before initialization");
  });
  
  // Memoize the parent-to-children map based on mindMapData structure
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
  // Dependency: Only recalculate when the node list itself changes structurally
  }, [mindMapData?.nodes]); 

  // Get all descendant node IDs (recursive)
  const getDescendantIds = useCallback((nodeId: string, nodeMap: Record<string, string[]>): string[] => {
    const children = nodeMap[nodeId] || [];
    const descendants = [...children];
    
    children.forEach(childId => {
      const childDescendants = getDescendantIds(childId, nodeMap);
      descendants.push(...childDescendants);
    });
    
    return descendants;
  }, []); // No dependencies needed if it purely operates on its arguments

  // Toggle visibility of children nodes
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
    // No need to call updateNodeVisibility here, the effect below handles it
  }, []); // Removed updateNodeVisibility dependency

  // Update node visibility based on collapsed state
  const updateNodeVisibility = useCallback(() => {
    // Use the memoized parentToChildrenMap
    if (!mindMapData || Object.keys(parentToChildrenMap).length === 0) return;
    
    // Find all nodes that should be hidden due to their ancestor being collapsed
    const nodesToHide = new Set<string>();
    collapsedNodes.forEach(collapsedId => {
      // Pass the memoized map to getDescendantIds
      const descendants = getDescendantIds(collapsedId, parentToChildrenMap);
      descendants.forEach(id => nodesToHide.add(id));
    });
    
    // Update nodes with visibility and hasChildren data
    setNodes(currentNodes => 
      currentNodes.map(node => {
        // Use memoized map to check for children efficiently
        const nodeHasChildren = !!parentToChildrenMap[node.id]?.length;
        const childrenCollapsed = collapsedNodes.has(node.id);
        
        return {
          ...node,
          hidden: nodesToHide.has(node.id),
          data: {
            ...node.data,
            hasChildren: nodeHasChildren,
            childrenCollapsed: childrenCollapsed,
            // Pass the stable toggle function
            toggleChildrenVisibility: toggleChildrenVisibility,
            // Preserve nodeType
            nodeType: node.data.nodeType
          }
        };
      })
    );
    
    // Update edges - hide edges connected to hidden nodes
    setEdges(currentEdges => 
      currentEdges.map(edge => ({
        ...edge,
        hidden: nodesToHide.has(edge.target as string) // Only need to check target for hiding
      }))
    );
  // Dependencies: Recalculate visibility when collapsed nodes change or the map changes
  }, [collapsedNodes, parentToChildrenMap, mindMapData, getDescendantIds, toggleChildrenVisibility, setNodes, setEdges]);

  // Effect to update visibility when dependencies change
  useEffect(() => {
    updateNodeVisibility();
  }, [updateNodeVisibility]); // Trigger effect when the callback itself changes (due to its deps)

  // Update node data
  const updateNodeData = useCallback((nodeId: string, newData: {title?: string; description?: string; width?: number; pageNumber?: number; expanded?: boolean}) => {
    // Apply visual feedback for the edited node (like a subtle highlight)
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId) {
          // Update the node data
          // The visual highlight is now handled by CSS in CustomNode.tsx
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
              // Keep essential functions
              updateNodeData,
              toggleChildrenVisibility,
              // Preserve other important data
              hasChildren: node.data.hasChildren,
              childrenCollapsed: node.data.childrenCollapsed,
              // Preserve the original nodeType
              nodeType: node.data.nodeType,
            },
            // No need to manipulate style or className here anymore for highlighting
          };
        }
        return node;
      })
    );
    
    // Update the mindMapData with a flag to prevent unnecessary layout recalculation
    if (mindMapData) {
      const updatedMindMapData = {
        ...mindMapData,
        nodes: mindMapData.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              title: newData.title ?? n.title,
              description: newData.description ?? n.description,
              // Make sure we keep the original type
              type: n.type,
              // Store expanded state in mindMapData if provided
              ...(newData.expanded !== undefined && { expanded: newData.expanded }),
              __contentOnlyUpdate: true // Flag to indicate this update shouldn't trigger layout recalculation
            };
          }
          return n;
        }),
        __contentOnlyUpdate: true // Add a flag at the root level too
      };
      
      // Use setTimeout to break potential update cycles
      // Although, if this update never causes a loop, setTimeout might be unnecessary here too.
      // Keeping it for now as a precaution.
      setTimeout(() => {
        setMindMapData(updatedMindMapData);
      }, 0);
    }
  }, [mindMapData, setNodes, toggleChildrenVisibility]);
  
  // Always update the references
  useEffect(() => {
    // Update the ref with the latest implementation that has access to current state
    addFollowUpNodeRef.current = addFollowUpNode;
    deleteNodeRef.current = deleteNode;
  });

  // Load example mind map function
  const loadExampleMindMap = useCallback(() => {
    setLoading(true);
    setLoadingStage('processing');
    setError(null);
    setMindMapData(EXAMPLE_MINDMAP);
    setPdfUrl(EXAMPLE_PDF_URL);
    setFileName('mindmap'); // Reset filename when loading example
    setCollapsedNodes(new Set()); // Reset collapsed state
    
    // Small delay to allow state updates before layout calculation
    setTimeout(() => {
      // ... layout calculation logic ...
       // Use the consistent padding
      reactFlowInstance.current?.fitView({ padding: 0.4, duration: 800 });
      setLoading(false);
      setLoadingStage(null);
    }, 100);
  }, [setLoading, setLoadingStage, setError, setMindMapData, setPdfUrl, setFileName, setCollapsedNodes]); 

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

    // --- Moved loading state setters to the beginning ---
    setLoading(true);           // Set main loading true immediately
    setLoadingStage('uploading'); // Indicate upload stage
    setFileLoading(true);       // Keep this if Sidebar uses it
    setError(null);             // Clear previous errors
    setUploadError(null);       // Clear previous upload errors

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
      setFileName(file.name); // Update the file name
          
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
      
      // --- Loading state is already set, now update stage for processing ---
      // setLoading(true); // Already set above
      setLoadingStage('processing');
      
      try {
        // Generate a new mindmap for the uploaded PDF
        await generateInitialMindMap(file.name, uploadedBlobUrl);
        setLoading(false);
        setLoadingStage(null);
      } catch (mindmapError) {
        console.error('Error generating mindmap:', mindmapError);
        const errorMessage = mindmapError instanceof Error ? mindmapError.message : 'Failed to generate mindmap';
        setError(errorMessage);
        setLoading(false);
        setLoadingStage(null);
      }
      
      return uploadedBlobUrl;
    } catch (error) {
      console.error('Error handling file upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
      setUploadError(error instanceof Error ? error : new Error('Unknown upload error'));
      setError(errorMessage);
      // --- Ensure loading is reset on error --- 
      setLoading(false);
      setLoadingStage(null);
      return null;
    } finally {
      // --- Simplify finally block --- 
      setFileLoading(false);
      // No need to check loading state here, it's handled in try/catch/finally above
      // if (loading) { 
      //   setLoadingStage(null);
      // }
    }
  }, [generateInitialMindMap, setPdfUrl, setMindMapData, setLoading, setLoadingStage, setError, setFileName]); // Add state setters to dependency array

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
              addFollowUpNode: addFollowUpNodeRef.current,
              deleteNode: deleteNodeRef.current,
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
  }, [mindMapData, nodes.length, collapsedNodes, toggleChildrenVisibility, nodePositions]);

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
      
      try {
        // First get current ReactFlow nodes to ensure we don't lose any nodes
        let currentNodeIds = new Set<string>();
        if (reactFlowInstance.current) {
          const currentNodes = reactFlowInstance.current.getNodes();
          currentNodeIds = new Set(currentNodes.map((node: Node) => node.id));
        } else {
          // Fall back to nodes state if reactFlowInstance isn't available
          currentNodeIds = new Set(nodes.map((node: Node) => node.id));
        }
        
        // Check if there are any nodes in ReactFlow that aren't in mindMapData
        const missingNodes = nodes.filter(node => {
          return !mindMapData.nodes.some(mindMapNode => mindMapNode.id === node.id);
        });
        
        // Add any missing nodes to mindMapData for this layout change
        let updatedMindMapData = { ...mindMapData };
        if (missingNodes.length > 0) {
          // First build a map of edge connections to determine parent-child relationships
          const edgeMap: Record<string, string> = {};
          if (reactFlowInstance.current) {
            const allEdges = reactFlowInstance.current.getEdges();
            // @ts-ignore - Edge type is inferred from ReactFlow
            allEdges.forEach(edge => {
              // Use explicit typing when accessing properties
              const target = edge.target as string;
              const source = edge.source as string;
              edgeMap[target] = source;
            });
          } else {
            // Fall back to edges state
            // @ts-ignore - Edge type is inferred from ReactFlow
            edges.forEach(edge => {
              // Use explicit typing when accessing properties
              const target = edge.target as string;
              const source = edge.source as string;
              edgeMap[target] = source;
            });
          }
          
          const newMindMapNodes = missingNodes.map((node: Node) => {
            // Get parent ID from edge connections rather than node data
            const parentId = edgeMap[node.id] || null;
            
            // Get parent's level or default to 0
            let level = 0;
            if (parentId) {
              const parentNode = mindMapData.nodes.find(n => n.id === parentId);
              if (parentNode) {
                level = parentNode.level + 1;
              }
            }
            
            return {
              id: node.id,
              title: node.data.title || '',
              description: node.data.description || '',
              parentId: parentId,
              level: level,
              type: node.data.nodeType || 'qna',
              pageNumber: node.data.pageNumber
            };
          });
          
          updatedMindMapData = {
            ...mindMapData,
            nodes: [...mindMapData.nodes, ...newMindMapNodes]
          };
        }
        
        // Generate the layout with enhanced positioning algorithm
        const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(
          updatedMindMapData,
          updateNodeData,
          nextLayout
        );
        
        // Add the addFollowUpNode function to all nodes' data
        // Ensure each node has the correct layout direction explicitly set
        const nodesWithFollowUp = flowNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            addFollowUpNode: addFollowUpNodeRef.current,
            deleteNode: deleteNodeRef.current,
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
  }, [currentLayoutIndex, mindMapData, nodes, toggleChildrenVisibility, updateNodeData]);

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
          addFollowUpNode: addFollowUpNodeRef.current,
          deleteNode: deleteNodeRef.current,
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
  }, [mindMapData, nodes.length, updateNodeData, toggleChildrenVisibility, currentLayoutIndex]);

  // Customize onNodesChange to track positions *after* node drags complete
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Call the original onNodesChange to apply immediate visual updates
    onNodesChange(changes);

    // Check for position changes that indicate the *end* of a drag
    const dragStopChanges = changes.filter(
      (change): change is NodePositionChange =>
        change.type === 'position' && change.dragging === false && change.position !== undefined
    );

    if (dragStopChanges.length > 0) {
      // Update positions state only for the nodes that finished dragging
      setNodePositions(prev => {
        const newPositions = { ...prev };
        dragStopChanges.forEach(change => {
          // Ensure position exists before assigning
          if (change.position) {
             newPositions[change.id] = change.position;
          }
        });
        return newPositions;
      });
    }
  }, [onNodesChange]); // Dependency: only the original onNodesChange setter

  // Delete a node and its connected edges
  const deleteNode = useCallback((nodeId: string) => {
    let parentId: string | undefined = undefined;
    let childrenToReparent: string[] = [];

    // Directly update nodes state
    setNodes(currentNodes => {
      const nodeToDelete = currentNodes.find(n => n.id === nodeId);
      parentId = nodeToDelete?.data.parentId; // Capture parentId before filtering

      // Find children of the node being deleted
      childrenToReparent = currentNodes
        .filter(n => n.data.parentId === nodeId)
        .map(n => n.id);

      // Filter out the deleted node
      let updatedNodes = currentNodes.filter(node => node.id !== nodeId);

      // Reparent children to grandparent (if parent exists)
      if (parentId && childrenToReparent.length > 0) {
        updatedNodes = updatedNodes.map(node => {
          if (childrenToReparent.includes(node.id)) {
            return {
              ...node,
              data: { ...node.data, parentId: parentId } // Update parentId in data
            };
          }
          return node;
        });
      }

      // Update the original parent's hasChildren status
      if (parentId) {
        const parentStillHasChildren = updatedNodes.some(node => node.data.parentId === parentId);
        updatedNodes = updatedNodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              data: { ...node.data, hasChildren: parentStillHasChildren }
            };
          }
          return node;
        });
      }

      return updatedNodes;
    });

    // Directly update edges state
    setEdges(currentEdges => {
      // Remove edges connected to the deleted node
      let updatedEdges = currentEdges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      );

      // Add new edges from grandparent to reparented children
      if (parentId && childrenToReparent.length > 0) {
        childrenToReparent.forEach(childId => {
          const uniqueEdgeId = `e-${parentId}-${childId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          updatedEdges.push({
            id: uniqueEdgeId,
            source: parentId!,
            target: childId,
            sourceHandle: 'source', // Assuming default handle names
            targetHandle: 'target', // Assuming default handle names
            type: 'bezier',
            style: { stroke: '#3182CE', strokeWidth: 1.5, strokeOpacity: 0.8 }, // Consistent style
            animated: false,
            className: 'mindmap-edge'
          });
        });
      }
      return updatedEdges;
    });

    // Update nodePositions state (remove deleted node)
    setNodePositions(prev => {
      const { [nodeId]: _, ...rest } = prev; // Destructure to remove the key
      return rest;
    });

    // Update collapsedNodes state (remove deleted node if present)
    setCollapsedNodes(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(nodeId)) {
        newCollapsed.delete(nodeId);
      }
      // Also remove any reparented children from collapsed set? Maybe not needed.
      return newCollapsed;
    });

    // OPTIONAL: Update mindMapData state asynchronously without triggering layout
    // This preserves mindMapData for export/other uses but avoids performance hit.
    setTimeout(() => {
        setMindMapData(prevData => {
            if (!prevData) return null;

            let updatedMindMapNodes = prevData.nodes.filter(node => node.id !== nodeId);

            if (parentId && childrenToReparent.length > 0) {
                 updatedMindMapNodes = updatedMindMapNodes.map(node => {
                    if (childrenToReparent.includes(node.id)) {
                        // FIX: Convert undefined parentId to null to match MindMapNode type
                        return { ...node, parentId: parentId ?? null }; 
                    }
                    return node;
                });
            }
            
            return {
                ...prevData,
                nodes: updatedMindMapNodes,
                __internalUpdate: true // Add a flag to signify internal update if needed elsewhere
            };
        });
    }, 0);

    // No need to call updateNodeVisibility explicitly if React Flow handles hidden state internally?
    // If visibility relies on hasChildren/childrenCollapsed in data, it should update automatically.

  // Removed mindMapData from dependencies to avoid triggering this on internal mindMapData updates
  }, [setNodes, setEdges, setNodePositions, setCollapsedNodes]);

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
                  addFollowUpNode: addFollowUpNodeRef.current,
                  deleteNode: deleteNodeRef.current, 
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
            addFollowUpNode: addFollowUpNodeRef.current,
            deleteNode: deleteNodeRef.current,
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
  }, [mindMapData, currentLayoutIndex, loading, updateNodeData, toggleChildrenVisibility, setNodes, setEdges, nodes.length]);

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
    deleteNode: deleteNodeRef.current,
    handleResetView,
    loadExampleMindMap,
    pdfUrl,
    fileName,
    currentLayoutIndex,
    cycleLayout
  };
}