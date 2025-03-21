'use client';

import React, { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import Uploader from './components/Uploader';
import { MindMapData, MindMapNode, COLUMN_WIDTH, NODE_VERTICAL_SPACING, sampleData, NodePosition } from './components/MindMapTypes';
import InfoTip from './components/InfoTip';
import ZoomControls from './components/ZoomControls';
import DownloadOptions from './components/DownloadOptions';
import CanvasPage from './components/CanvasPage';
import FollowUpCard from './components/FollowUpCard';

export default function PaperMap() {
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 300, y: 200 });
  
  // Create refs for container elements
  const containerRef = useRef<HTMLDivElement>(null);
  const mindmapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeExpanded, setNodeExpanded] = useState<Record<string, boolean>>({});
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggedPositions, setDraggedPositions] = useState<Record<string, NodePosition>>({});
  const [hiddenChildren, setHiddenChildren] = useState<Record<string, boolean>>({});
  const isCardBeingDragged = useRef(false);
  const [toggleButtonRefs, setToggleButtonRefs] = useState<Record<string, HTMLDivElement>>({});

  // New state for animation
  const [visibilityState, setVisibilityState] = useState<Record<string, boolean>>({});
  const [animatingNodes, setAnimatingNodes] = useState<Record<string, boolean>>({});
  // New state to track animation direction (true = showing, false = hiding)
  const [showingAnimation, setShowingAnimation] = useState<Record<string, boolean>>({});

  // Track if data structure has changed or if it's just a text edit
  const [dataStructureVersion, setDataStructureVersion] = useState(0);

  // New state for selected nodes
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const lastDragPosition = useRef<{ x: number, y: number } | null>(null);
  
  // Add fileName state
  const [fileName, setFileName] = useState<string>("mindmap");

  // Add state to track node widths
  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({});

  // Add state to store the PDF data
  const [pdfData, setPdfData] = useState<string | null>(null);
  
  // Add state to track loading status of follow-up questions
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Add state for follow-up card
  const [followUpParentNode, setFollowUpParentNode] = useState<MindMapNode | null>(null);
  const [followUpPosition, setFollowUpPosition] = useState<NodePosition | null>(null);

  // Use refs to handle functions and break circular dependencies
  const processFollowUpQuestionRef = useRef<((nodeId: string, parentNode: MindMapNode, question: string) => Promise<void>) | null>(null);
  const createFollowUpQuestionRef = useRef<((parentId: string, question: string) => void) | null>(null);

  // Function to process a follow-up question and update the node with the answer
  processFollowUpQuestionRef.current = async (nodeId: string, parentNode: MindMapNode, question: string) => {
    if (!data) return;
    
    try {
      // Call the API to get an answer
      const response = await fetch('/api/papermap/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfData,
          nodeContext: parentNode,
          question
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      const answerData = await response.json();
      console.log("Received answer data:", answerData);
      
      // Ensure data is still available
      if (!data) return;
      
      // Update the node with the answer
      if (answerData.answer) {
        console.log("Updating node with answer. Before update visibility:", {
          nodeId,
          visibilityState: visibilityState[nodeId],
          hiddenChildren: hiddenChildren[nodeId],
          nodeExists: data.nodes.some(n => n.id === nodeId),
          nodesCount: data.nodes.length
        });

        // Find original node to preserve all properties
        let originalNode = data.nodes.find(n => n.id === nodeId);
        
        // Recovery: If node can't be found, recreate it
        if (!originalNode) {
          console.log(`Node ${nodeId} not found - recreating it`);
          originalNode = {
            id: nodeId,
            title: question,
            description: 'Loading answer...',
            parentId: parentNode.id,
            level: parentNode.level + 1,
            type: 'qna'
          };
          
          // Also ensure the position is set for the recreated node
          if (!nodePositions[nodeId]) {
            const parentPosition = nodePositions[parentNode.id] || { x: 0, y: 0 };
            const parentWidth = nodeWidths[parentNode.id] || 250;
            
            const position = {
              x: parentPosition.x + parentWidth + 50,
              y: parentPosition.y
            };
            
            // Update node positions
            setNodePositions(prevPositions => ({
              ...prevPositions,
              [nodeId]: position
            }));
          }
        }

        // Create a new node array with all existing nodes except the one we're updating
        const updatedNodesWithAnswer = data.nodes.filter(n => n.id !== nodeId);
        
        // Add the updated node with the answer
        updatedNodesWithAnswer.push({
          ...originalNode,
          description: answerData.answer,
          type: 'qna'
        });
        
        // Log the node counts to help with debugging
        console.log("Node counts:", {
          before: data.nodes.length,
          after: updatedNodesWithAnswer.length,
          nodeId
        });
        
        // Update the data with the new nodes array
        setData({
          nodes: updatedNodesWithAnswer
        });
        
        // Force all visibility states to ensure the node is visible
        setVisibilityState(prev => ({
          ...prev,
          [nodeId]: true
        }));
        
        setAnimatingNodes(prev => {
          const newState = { ...prev };
          delete newState[nodeId];
          return newState;
        });
        
        setShowingAnimation(prev => ({
          ...prev,
          [nodeId]: true
        }));
        
        // Make sure parent's children are visible
        if (parentNode) {
          setHiddenChildren(prev => ({
            ...prev,
            [parentNode.id]: false
          }));
        }
        
        console.log("Updated node visibility state:", {
          nodeId,
          visibilityState: true,
          animatingNodes: false,
          showingAnimation: true,
          parentHiddenChildren: parentNode ? false : null
        });
      }
    } catch (error) {
      console.error('Error getting answer:', error);
      
      // Ensure data is still available
      if (!data) return;
      
      // Find original node to preserve all properties
      let originalNode = data.nodes.find(n => n.id === nodeId);
      
      // Recovery: If node can't be found, recreate it
      if (!originalNode) {
        console.log(`Error node ${nodeId} not found - recreating it`);
        originalNode = {
          id: nodeId,
          title: question,
          description: 'Loading answer...',
          parentId: parentNode.id,
          level: parentNode.level + 1,
          type: 'qna'
        };
        
        // Also ensure the position is set for the recreated node
        if (!nodePositions[nodeId]) {
          const parentPosition = nodePositions[parentNode.id] || { x: 0, y: 0 };
          const parentWidth = nodeWidths[parentNode.id] || 250;
          
          const position = {
            x: parentPosition.x + parentWidth + 50,
            y: parentPosition.y
          };
          
          // Update node positions
          setNodePositions(prevPositions => ({
            ...prevPositions,
            [nodeId]: position
          }));
        }
      }

      // Similar to success case, recreate the node array to force rerender
      const updatedNodesWithError = data.nodes.filter(n => n.id !== nodeId);
      
      // Add the node with error message
      updatedNodesWithError.push({
        ...originalNode,
        description: "Sorry, I couldn't get an answer for this question. Please try again later.",
        type: 'qna'
      });
      
      setData({
        nodes: updatedNodesWithError
      });
      
      // Force all visibility settings
      setVisibilityState(prev => ({
        ...prev,
        [nodeId]: true
      }));
      
      setAnimatingNodes(prev => {
        const newState = { ...prev };
        delete newState[nodeId];
        return newState;
      });
      
      setShowingAnimation(prev => ({
        ...prev,
        [nodeId]: true
      }));
      
      // Make sure parent's children are visible
      if (parentNode) {
        setHiddenChildren(prev => ({
          ...prev,
          [parentNode.id]: false
        }));
      }
      
      console.log("Updated node with error, visibility:", { 
        nodeId, 
        visible: true,
        animating: false,
        showing: true
      });
    } finally {
      setFollowUpLoading(false);
    }
  };

  // Function to create and process follow-up questions
  createFollowUpQuestionRef.current = (parentId: string, question: string) => {
    if (!data || !pdfData) return;
    
    const parentNode = data.nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    
    // Generate a unique ID for the new node
    const newNodeId = `follow-up-${Date.now()}`;
    console.log("Creating follow-up node with ID:", newNodeId);
    
    // Create a new node with the question as the title and mark it as a QnA node
    const newNode: MindMapNode = {
      id: newNodeId,
      title: question,
      description: 'Loading answer...', // Initial placeholder
      parentId: parentId,
      level: parentNode.level + 1,
      type: 'qna' // Add type property to distinguish QnA nodes
    };
    
    // Calculate position for the new node
    const parentPosition = nodePositions[parentId] || { x: 0, y: 0 };
    const parentWidth = nodeWidths[parentId] || 250; // Use actual width if available
    const position = { 
      x: parentPosition.x + parentWidth + 50, // Position to the right with a 50px gap
      y: parentPosition.y // Same vertical position
    };
    
    const currentData = data; // Create a non-null reference to data
    
    // First update the position, which doesn't depend on the data state
    // This ensures the position is set before the node is added to the data
    setNodePositions(prevPositions => ({
      ...prevPositions,
      [newNodeId]: position
    }));
    
    // Make sure the visibility state is set before adding the node to the data
    // This ensures the node is visible immediately when rendered
    setVisibilityState(prev => ({
      ...prev,
      [newNodeId]: true
    }));
    
    // Make parent's children visible - crucial for proper rendering
    if (hiddenChildren[parentId]) {
      setHiddenChildren(prev => ({
        ...prev,
        [parentId]: false
      }));
    }
    
    // Ensure showing animation is set to true
    setShowingAnimation(prev => ({
      ...prev,
      [newNodeId]: true
    }));
    
    // Make sure the node is not in the animating state
    setAnimatingNodes(prev => {
      const newState = { ...prev };
      delete newState[newNodeId];
      return newState;
    });
    
    // Now update the data with the new node
    // This happens last to ensure all visibility and position states are set
    const updatedNodes = [...currentData.nodes, newNode];
    setData({
      ...currentData,
      nodes: updatedNodes
    });
    
    console.log("Creating follow-up QnA node with visibility:", { 
      id: newNodeId,
      visible: true,
      hiddenChildren: false,
      animating: false,
      showing: true,
      parentHiddenChildren: parentId ? hiddenChildren[parentId] : null,
      parentId,
      position
    });
    
    // Set loading state
    setFollowUpLoading(true);
    
    // Process the question (this happens asynchronously)
    if (processFollowUpQuestionRef.current) {
      processFollowUpQuestionRef.current(newNodeId, parentNode, question);
    } else {
      console.error("processFollowUpQuestionRef.current is not defined yet");
    }
  };

  // Modified function to show the follow-up card instead of directly creating a question
  const handleAskFollowUp = useCallback((nodeId: string) => {
    if (!data) return;
    
    const parentNode = data.nodes.find(n => n.id === nodeId);
    if (!parentNode) return;
    
    // Calculate position for the follow-up card (to the right of the parent node)
    const parentPosition = nodePositions[nodeId] || { x: 0, y: 0 };
    const parentWidth = nodeWidths[nodeId] || 250;
    
    const position = {
      x: parentPosition.x + parentWidth + 50,
      y: parentPosition.y
    };
    
    // Set the parent node and position to show the follow-up card
    setFollowUpParentNode(parentNode);
    setFollowUpPosition(position);
  }, [data, nodePositions, nodeWidths]);

  // Handle saving the follow-up question
  const handleSaveFollowUp = useCallback((parentId: string, question: string) => {
    if (!followUpParentNode) return;
    
    // Clear the follow-up card state
    setFollowUpParentNode(null);
    setFollowUpPosition(null);
    
    // Create the follow-up question using the ref
    if (createFollowUpQuestionRef.current) {
      createFollowUpQuestionRef.current(parentId, question);
    } else {
      console.error("createFollowUpQuestionRef.current is not defined yet");
    }
  }, [followUpParentNode]);

  // Handle canceling the follow-up question
  const handleCancelFollowUp = useCallback(() => {
    setFollowUpParentNode(null);
    setFollowUpPosition(null);
  }, []);

  // Handle zoom controls with smaller increments for smoother zooming
  const handleZoomIn = useCallback(() => {
    setInitialRenderComplete(true);
    
    if (!mindmapContainerRef.current) return;
    
    const container = mindmapContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate the center point in the current view
    const centerX = -pan.x / zoom + containerWidth / (2 * zoom);
    const centerY = -pan.y / zoom + containerHeight / (2 * zoom);
    
    // Calculate new zoom level with smaller increment for smoother transition
    const step = zoom > 1 ? 0.02 : 0.01;
    const newZoom = Math.min(zoom + step, 2);
    
    // Calculate new pan to maintain the same center point
    const newPanX = -(centerX * newZoom - containerWidth / 2);
    const newPanY = -(centerY * newZoom - containerHeight / 2);
    
    // Apply new zoom and pan simultaneously
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan, mindmapContainerRef]);
  
  const handleZoomOut = useCallback(() => {
    setInitialRenderComplete(true);
    
    if (!mindmapContainerRef.current) return;
    
    const container = mindmapContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate the center point in the current view
    const centerX = -pan.x / zoom + containerWidth / (2 * zoom);
    const centerY = -pan.y / zoom + containerHeight / (2 * zoom);
    
    // Calculate new zoom level with smaller increment for smoother transition
    const step = zoom > 1 ? 0.02 : 0.01;
    const newZoom = Math.max(zoom - step, 0.1);
    
    // Calculate new pan to maintain the same center point
    const newPanX = -(centerX * newZoom - containerWidth / 2);
    const newPanY = -(centerY * newZoom - containerHeight / 2);
    
    // Apply new zoom and pan simultaneously
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan, mindmapContainerRef]);

  // Handle zoom from wheel or other sources
  const handleZoom = useCallback((direction: number) => {
    setInitialRenderComplete(true);
    
    if (!mindmapContainerRef.current) return;
    
    const container = mindmapContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate the center point in the current view
    const centerX = -pan.x / zoom + containerWidth / (2 * zoom);
    const centerY = -pan.y / zoom + containerHeight / (2 * zoom);
    
    // Calculate new zoom level with smaller increment for smoother transition
    const step = zoom > 1 ? 0.02 : 0.01;
    const newZoom = direction > 0 
      ? Math.min(zoom + step, 2)
      : Math.max(zoom - step, 0.1);
    
    // Calculate new pan to maintain the same center point
    const newPanX = -(centerX * newZoom - containerWidth / 2);
    const newPanY = -(centerY * newZoom - containerHeight / 2);
    
    // Apply new zoom and pan simultaneously
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan, mindmapContainerRef]);

  // Calculate initial positions
  useEffect(() => {
    if (data) {
      // Don't recalculate positions if this is just a text update
      // Only calculate if positions haven't been set yet or if dataStructureVersion changed
      if (Object.keys(nodePositions).length === 0 || dataStructureVersion > 0) {
        const initialPositions: Record<string, NodePosition> = {};
        const usedPositions: Record<string, boolean> = {}; // Track used positions to avoid conflicts
        
        // First, position the root nodes
        const rootNodes = data.nodes.filter(node => node.parentId === null);
        rootNodes.forEach((node, index) => {
          initialPositions[node.id] = {
            x: 30, // Remove left margin for root nodes
            y: index * NODE_VERTICAL_SPACING + 30 // Remove top padding, keep vertical spacing
          };
          // Mark this position as used
          usedPositions[`0_${index}`] = true;
        });
        
        // Helper function to get all children of a node
        const getChildren = (nodeId: string) => {
          return data.nodes.filter(n => n.parentId === nodeId);
        };
        
        // Helper function to position a node and its children recursively
        const positionNodeAndChildren = (node: MindMapNode, level: number) => {
          // Skip if this node already has a position (e.g., root nodes)
          if (initialPositions[node.id]) return;
          
          const parentPos = initialPositions[node.parentId!];
          const children = getChildren(node.id);
          
          // Find the first available vertical position at this level, starting from parent's y
          let yPos = parentPos.y;
          let yIndex = Math.floor(yPos / NODE_VERTICAL_SPACING);
          
          // Check if position is already taken, if so, move down
          while (usedPositions[`${level}_${yIndex}`]) {
            yIndex++;
            yPos = yIndex * NODE_VERTICAL_SPACING + 50;
          }
          
          // Set position for this node
          initialPositions[node.id] = {
            x: level * COLUMN_WIDTH, // Use full COLUMN_WIDTH instead of reducing it
            y: yPos
          };
          
          // Mark this position as used
          usedPositions[`${level}_${yIndex}`] = true;
          
          // Position children recursively
          children.forEach(child => {
            positionNodeAndChildren(child, level + 1);
          });
        };
        
        // Process nodes level by level to ensure parent nodes are positioned before their children
        const maxLevel = Math.max(...data.nodes.map(n => n.level));
        
        for (let level = 1; level <= maxLevel; level++) {
          // Get all nodes at this level
          const nodesAtLevel = data.nodes.filter(n => n.level === level);
          
          // For each node at this level, position it and its descendants
          nodesAtLevel.forEach(node => {
            if (!initialPositions[node.id]) {
              positionNodeAndChildren(node, level);
            }
          });
        }
        
        setNodePositions(initialPositions);
        
        // Only do automatic centering on first load
        if (Object.keys(nodePositions).length === 0 && dataStructureVersion === 0) {
          // Flag to indicate this is the initial load
          const isInitialLoad = true;
          centerView(initialPositions, isInitialLoad);
        }
      }
    }
  }, [data, dataStructureVersion]);
  
  // Helper function to center the view - extracted for reuse
  const centerView = useCallback((positions: Record<string, NodePosition>, isInitialLoad = false) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate mindmap bounds including padding
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.values(positions).forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + 250); // 250px is card width
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + 80); // 80px is card height
    });
    
    // Add padding to ensure nodes near edges are visible
    const padding = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
    
    // Apply padding to bounds
    minX -= padding.left;
    maxX += padding.right;
    minY -= padding.top;
    maxY += padding.bottom;
    
    // Calculate mindmap dimensions with padding
    const mindmapWidth = maxX - minX;
    const mindmapHeight = maxY - minY;
    
    // Calculate the scale needed to fit the entire mindmap
    const scaleX = containerWidth / mindmapWidth;
    const scaleY = containerHeight / mindmapHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.2); // Cap at 1.2 to prevent excessive zoom
    
    // Calculate the pan needed to center, accounting for scale
    const scaledWidth = mindmapWidth * fitScale;
    const scaledHeight = mindmapHeight * fitScale;
    const newPanX = (containerWidth - scaledWidth) / 2 - minX * fitScale;
    const newPanY = (containerHeight - scaledHeight) / 2 - minY * fitScale;
    
    if (isInitialLoad) {
      // For initial load, set zoom and pan without animation
      setZoom(fitScale);
      setPan({ x: newPanX, y: newPanY });
      
      // Mark initial rendering as complete after a brief delay
      setTimeout(() => {
        setInitialRenderComplete(true);
      }, 100);
    } else {
      // For subsequent centering, use animation
      setInitialRenderComplete(true);
      
      if (canvasRef.current) {
        canvasRef.current.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      }
      
      setPan({ x: newPanX, y: newPanY });
      setZoom(fitScale);
      
      // Reset transition after animation
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      }, 600);
    }
  }, [containerRef, canvasRef]);

  // Modify the initial data loading
  useEffect(() => {
    if (!data) {  // Only set sample data if no data exists
      setData(sampleData);
    }
  }, [data]);

  // Reset dataStructureVersion after it's been processed
  useEffect(() => {
    if (dataStructureVersion > 0) {
      // This prevents repeated zoom resets by resetting the version after it's been used
      const timeoutId = setTimeout(() => {
        setDataStructureVersion(0);
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [dataStructureVersion]);
  
  // Center view ONLY when explicitly triggered by dataStructureVersion or fit button
  useEffect(() => {
    if (dataStructureVersion > 0 && data && containerRef.current) {
      // Use the centerView helper for consistency
      centerView(nodePositions);
    }
  }, [dataStructureVersion, data, centerView, nodePositions]);

  // Improved handleResetZoom function to match initial behavior
  const handleResetZoom = useCallback(() => {
    setInitialRenderComplete(true);
    setZoom(0.6);
    setPan({ x: 300, y: 200 });
  }, []);

  // CSS classes for selected status
  const getSelectionClassNames = (isSelected: boolean) => {
    return isSelected 
      ? 'ring-2 ring-blue-500 shadow-lg z-20' 
      : '';
  };

  // Register toggle button refs from NodeCard components
  const handleToggleButtonRef = useCallback((nodeId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      setToggleButtonRefs(prev => ({ ...prev, [nodeId]: el }));
    }
  }, []);

  // Toggle node expansion
  const toggleNode = (id: string) => {
    setNodeExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle children visibility with animation
  const toggleChildrenVisibility = (id: string) => {
    if (!data) return;
    
    // First, get all descendants that will be affected
    const findAllDescendants = (nodeId: string): string[] => {
      const children = data.nodes.filter(n => n.parentId === nodeId).map(n => n.id);
      const descendants = [...children];
      
      children.forEach(childId => {
        descendants.push(...findAllDescendants(childId));
      });
      
      return descendants;
    };
    
    const descendants = findAllDescendants(id);
    
    // If we're about to hide nodes, start animation to fade them out
    if (!hiddenChildren[id]) {
      // Mark these nodes as animating and set direction to hiding
      const newAnimatingNodes = { ...animatingNodes };
      const newShowingAnimation = { ...showingAnimation };
      
      descendants.forEach(nodeId => {
        newAnimatingNodes[nodeId] = true;
        newShowingAnimation[nodeId] = false; // Hiding animation
      });
      
      setAnimatingNodes(newAnimatingNodes);
      setShowingAnimation(newShowingAnimation);
      
      // Set visibility state to false to trigger fade out animation
      const newVisibilityState = { ...visibilityState };
      descendants.forEach(nodeId => {
        newVisibilityState[nodeId] = false;
      });
      setVisibilityState(newVisibilityState);
      
      // After animation completes, update actual hidden state
      setTimeout(() => {
        setHiddenChildren(prev => ({
          ...prev,
          [id]: true
        }));
        
        // Clear animating state
        const updatedAnimatingNodes = { ...animatingNodes };
        descendants.forEach(nodeId => {
          delete updatedAnimatingNodes[nodeId];
        });
        setAnimatingNodes(updatedAnimatingNodes);
      }, 100); // Reduced from 250ms to 150ms for snappier animation
    } else {
      // If we're showing nodes, update hidden state first
      setHiddenChildren(prev => ({
        ...prev,
        [id]: false
      }));
      
      // Then mark nodes as animating and set direction to showing
      const newAnimatingNodes = { ...animatingNodes };
      const newShowingAnimation = { ...showingAnimation };
      
      descendants.forEach(nodeId => {
        newAnimatingNodes[nodeId] = true;
        newShowingAnimation[nodeId] = true; // Showing animation
      });
      
      setAnimatingNodes(newAnimatingNodes);
      setShowingAnimation(newShowingAnimation);
      
      // Set a timeout to allow the DOM to update with the newly visible nodes
      setTimeout(() => {
        // Then trigger the animation in
        const newVisibilityState = { ...visibilityState };
        descendants.forEach(nodeId => {
          newVisibilityState[nodeId] = true;
        });
        setVisibilityState(newVisibilityState);
        
        // After animation completes, clear animating state
        setTimeout(() => {
          const updatedAnimatingNodes = { ...animatingNodes };
          descendants.forEach(nodeId => {
            delete updatedAnimatingNodes[nodeId];
          });
          setAnimatingNodes(updatedAnimatingNodes);
        }, 100); // Reduced from 250ms to 150ms for snappier animation
      }, 20); // Reduced from 50ms to 20ms for quicker start
    }
  };


  // Handle card selection
  const handleCardSelect = (nodeId: string, e: React.MouseEvent) => {
    // If shift key is pressed, toggle selection
    if (e.shiftKey) {
      setSelectedNodes(prev => {
        if (prev.includes(nodeId)) {
          return prev.filter(id => id !== nodeId);
        } else {
          return [...prev, nodeId];
        }
      });
    } else {
      // If this card isn't already selected, make it the only selection
      if (!selectedNodes.includes(nodeId)) {
        setSelectedNodes([nodeId]);
      }
      // If already selected, keep the selection for dragging
    }
  };

  // Handle card drag with multi-select support
  const handleDrag = (nodeId: string, e: any, data: { x: number, y: number }) => {
    isCardBeingDragged.current = true;
    
    setDraggedPositions(prev => {
      const newPositions = { ...prev };
      
      if (selectedNodes.includes(nodeId) && selectedNodes.length > 1) {
        // For multi-selection, apply same drag to all selected nodes
        const delta = lastDragPosition.current 
          ? { 
              x: data.x - lastDragPosition.current.x, 
              y: data.y - lastDragPosition.current.y 
            }
          : { x: 0, y: 0 };
        
        selectedNodes.forEach(id => {
          const currentDragPos = prev[id] || { x: 0, y: 0 };
          newPositions[id] = {
            x: currentDragPos.x + delta.x,
            y: currentDragPos.y + delta.y
          };
        });
      } else {
        // For single node, directly set the position
        newPositions[nodeId] = { x: data.x, y: data.y };
      }
      
      return newPositions;
    });
    
    lastDragPosition.current = { x: data.x, y: data.y };
  };

  // Handle card drag start
  const handleCardDragStart = () => {
    // Reset last position
    lastDragPosition.current = null;
    
    // Create a style element to disable ALL transitions during dragging
    const styleElement = document.createElement('style');
    styleElement.id = 'disable-all-transitions';
    styleElement.textContent = `
      * {
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Also apply directly to canvas for good measure
    if (canvasRef.current) {
      canvasRef.current.style.transition = 'none !important';
      const allElements = canvasRef.current.querySelectorAll('*');
      allElements.forEach(el => {
        (el as HTMLElement).style.cssText += 'transition: none !important; animation: none !important;';
      });
    }
  };

  // Handle card drag stop
  const handleCardDragStop = () => {
    // Move draggedPositions changes into nodePositions for persistence
    setNodePositions(prevNodePositions => {
      const newPositions = { ...prevNodePositions };
      
      // Apply all dragged positions to base positions without any constraints
      Object.entries(draggedPositions).forEach(([id, dragPos]) => {
        const basePos = prevNodePositions[id] || { x: 0, y: 0 };
        newPositions[id] = {
          x: basePos.x + dragPos.x,
          y: basePos.y + dragPos.y
        };
      });
      
      return newPositions;
    });
    
    // Clear all dragged positions
    setDraggedPositions({});
    lastDragPosition.current = null;
    
    // Using a sequence of delayed operations to ensure proper rendering
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const styleElement = document.getElementById('disable-all-transitions');
          if (styleElement) {
            document.head.removeChild(styleElement);
          }
          
          if (canvasRef.current) {
            canvasRef.current.style.transition = initialRenderComplete ? 
              'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
          }
          
          isCardBeingDragged.current = false;
        }, 350);
      });
    });
  };

  // Modify handleNodeUpdate to properly update the node
  const handleNodeUpdate = (nodeId: string, updates: Partial<MindMapNode>) => {
    if (!data) return;
    
    // Create new nodes array with the updated node
    const updatedNodes = data.nodes.map(node => 
      node.id === nodeId 
        ? { ...node, ...updates }
        : node
    );

    // Set the new data state immutably to ensure React detects the change
    setData({
      nodes: updatedNodes
    });
  };

  // Modify handleFileUpload to store the PDF data
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    
    const originalFileName = file.name;
    setFileName(originalFileName);

    const formData = new FormData();
    formData.append('file', file);
    
    // Store PDF data for future follow-up questions
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      setPdfData(base64Data);
    } catch (err) {
      console.error('Error reading PDF file:', err);
    }

    try {
      const response = await fetch('/api/papermap', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze paper');
      }

      const responseData = await response.json();
      
      // Validate and transform the response data
      if (!responseData.nodes || !Array.isArray(responseData.nodes)) {
        throw new Error('Invalid response format from server');
      }

      // Reset states
      setDraggedPositions({});
      setNodeExpanded({});
      setHiddenChildren({});
      setSelectedNodes([]);
      setNodePositions({}); // Clear node positions to trigger recalculation
      
      // Create a new MindMapData object with the response data
      const newData: MindMapData = {
        nodes: responseData.nodes.map((node: any) => ({
          id: node.id,
          title: node.title || '',
          description: node.description || '',
          parentId: node.parentId,
          level: node.level
        }))
      };

      // Set the new data
      setData(newData);
      
      // Trigger layout recalculation
      setDataStructureVersion(prev => prev + 1);

    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add new state variables for selection box
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 });
  const [isShiftKeyDown, setIsShiftKeyDown] = useState(false);

  // Track shift key state for cursor feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftKeyDown(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftKeyDown(false);
      }
    };

    // Handle when window loses focus or is blurred
    const handleBlur = () => {
      setIsShiftKeyDown(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
    };
  }, []);

  // Modify handleNodeResize to be more responsive
  const handleNodeResize = useCallback((nodeId: string, width: number) => {
    // Update nodeWidths immediately
    setNodeWidths(prev => {
      const newWidths = { ...prev, [nodeId]: width };
      return newWidths;
    });
  }, []);

  const [showTip, setShowTip] = useState(true);

  // Use effect to automatically hide the tip after some time
  useEffect(() => {
    if (showTip) {
      const timer = setTimeout(() => {
        setShowTip(false);
      }, 8000); // Hide after 8 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showTip]);

  // Also hide the tip after successfully selecting multiple cards
  useEffect(() => {
    if (selectedNodes.length > 1) {
      setShowTip(false);
    }
  }, [selectedNodes]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A or Cmd+A to select all visible nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Prevent the browser's default "select all" behavior
        e.preventDefault();
        
        if (data) {
          // Only select nodes that are currently visible
          const visibleNodeIds = data.nodes
            .filter(node => {
              // If this node is a descendant of any hidden node, it's not visible
              let currentNode = node;
              let isDescendantOfHiddenNode = false;
              
              while (currentNode.parentId) {
                const parent = data.nodes.find(n => n.id === currentNode.parentId);
                if (!parent) break;
                
                // If any ancestor has hidden children, don't show this node
                if (hiddenChildren[parent.id]) {
                  isDescendantOfHiddenNode = true;
                  break;
                }
                
                currentNode = parent;
              }
              
              return !isDescendantOfHiddenNode;
            })
            .map(node => node.id);
          
          setSelectedNodes(visibleNodeIds);
        }
      }
      
      // Escape key to clear selection
      if (e.key === 'Escape') {
        setSelectedNodes([]);
      }
      
      // Delete key to handle selected nodes (if needed in the future)
      if (e.key === 'Delete' && selectedNodes.length > 0) {
        // For now, just log - you could implement deletion if needed
        console.log('Delete pressed on selected nodes:', selectedNodes);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [data, hiddenChildren, selectedNodes]);

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <Uploader 
          onFileUpload={handleFileUpload}
          loading={loading}
          error={error}
        />
        
        <div className="absolute left-1/2 -translate-x-1/2">
          {loading && <p className="text-blue-600">Analyzing paper...</p>}
          {error && <p className="text-red-600">{error}</p>}
        </div>
        
        <DownloadOptions 
          data={data}
          containerRef={mindmapContainerRef}
          onResetZoom={handleResetZoom}
          nodePositions={nodePositions}
          fileName={fileName}
        />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <CanvasPage
          data={data}
          nodePositions={nodePositions}
          draggedPositions={draggedPositions}
          nodeExpanded={nodeExpanded}
          hiddenChildren={hiddenChildren}
          selectedNodes={selectedNodes}
          visibilityState={visibilityState}
          onNodeUpdate={handleNodeUpdate}
          onNodeSelect={handleCardSelect}
          onNodeDrag={handleDrag}
          onNodeDragStart={handleCardDragStart}
          onNodeDragStop={handleCardDragStop}
          onToggleExpand={toggleNode}
          onToggleChildren={toggleChildrenVisibility}
          onNodeResize={handleNodeResize}
          registerToggleButtonRef={handleToggleButtonRef}
          zoom={zoom}
          onZoom={handleZoom}
          pan={pan}
          onPan={setPan}
          mindmapContainerRef={mindmapContainerRef}
          onAskFollowUp={handleAskFollowUp}
        >
          {/* Zoom controls */}
          <ZoomControls 
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
          />
          
          {/* Selection box overlay */}
          {isBoxSelecting && (
            <div 
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none z-50"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX) + 'px',
                top: Math.min(selectionBox.startY, selectionBox.endY) + 'px',
                width: Math.abs(selectionBox.endX - selectionBox.startX) + 'px',
                height: Math.abs(selectionBox.endY - selectionBox.startY) + 'px',
              }}
            />
          )}
          
          {/* Multi-select info tooltip */}
          <InfoTip 
            visible={showTip} 
            onClose={() => setShowTip(false)}
          />
          
          {/* Selection counter */}
          {selectedNodes.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-lg shadow-md text-sm font-medium z-50 flex items-center space-x-2 animate-fadeIn">
              <span>{selectedNodes.length} card{selectedNodes.length > 1 ? 's' : ''} selected</span>
              <button 
                onClick={() => setSelectedNodes([])}
                className="ml-2 text-white hover:bg-blue-600 rounded-full h-5 w-5 flex items-center justify-center text-xs"
                title="Clear selection"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Loading indicator for follow-up questions */}
          {followUpLoading && (
            <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md z-50 flex items-center space-x-3 animate-fadeIn">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Processing follow-up question...</span>
            </div>
          )}
          
          {/* Follow-up question card */}
          {followUpParentNode && followUpPosition && (
            <FollowUpCard
              parentNode={followUpParentNode}
              basePosition={followUpPosition}
              onSave={handleSaveFollowUp}
              onCancel={handleCancelFollowUp}
            />
          )}
        </CanvasPage>
      </div>
    </div>
  );
}

