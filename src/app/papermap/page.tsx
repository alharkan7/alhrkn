'use client';

import React, { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import NodeCard from './components/NodeCard';
import Uploader from './components/Uploader';
import Line from './components/Line';
import { FitToViewIcon } from './components/Icons';
import { MindMapData, MindMapNode, COLUMN_WIDTH, NODE_VERTICAL_SPACING, sampleData, NodePosition } from './components/MindMapTypes';
import InfoTip from './components/InfoTip';
import ZoomControls from './components/ZoomControls';

export default function PaperMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeExpanded, setNodeExpanded] = useState<Record<string, boolean>>({});
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggedPositions, setDraggedPositions] = useState<Record<string, NodePosition>>({});
  const [hiddenChildren, setHiddenChildren] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isTouchDragging = useRef(false);
  const isCardBeingDragged = useRef(false);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [touchCenter, setTouchCenter] = useState<{ x: number, y: number } | null>(null);
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
  
  // Track if initial rendering is complete to enable transitions
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);

  // Handle zoom controls with smaller increments for smoother zooming
  const handleZoomIn = useCallback(() => {
    // Ensure transitions are enabled
    setInitialRenderComplete(true);
    
    setZoom(prev => Math.min(prev + 0.05, 2));
  }, [setInitialRenderComplete]);
  
  const handleZoomOut = useCallback(() => {
    // Ensure transitions are enabled
    setInitialRenderComplete(true);
    
    // Ensure consistent zoom out steps - for large zoom values use larger steps
    // For small zoom values use smaller steps to avoid jumping too far
    setZoom(prev => {
      const step = Math.max(0.05, prev * 0.1); // 10% of current zoom or minimum of 0.05
      return Math.max(0.1, prev - step);
    });
  }, [setInitialRenderComplete]);
  
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
            x: 0, // Root nodes are at level 0
            y: index * NODE_VERTICAL_SPACING + 50
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
            x: level * COLUMN_WIDTH,
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
    
    // Calculate mindmap bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.values(positions).forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + 300); // 300px is card width
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + 100); // Approx card height
    });
    
    // Calculate mindmap dimensions
    const mindmapWidth = maxX - minX;
    const mindmapHeight = maxY - minY;
    
    // Calculate the scale needed to fit the entire mindmap
    const scaleX = containerWidth / mindmapWidth;
    const scaleY = containerHeight / mindmapHeight;
    const fitScale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding
    
    // Calculate the pan needed to center
    const newPanX = (containerWidth - mindmapWidth * fitScale) / 2 - minX * fitScale;
    const newPanY = (containerHeight - mindmapHeight * fitScale) / 2 - minY * fitScale;
    
    if (isInitialLoad) {
      // For initial load, set zoom and pan without animation
      setZoom(fitScale);
      setPan({ x: newPanX, y: newPanY });
      
      // Mark initial rendering as complete after a brief delay to ensure values are applied
      setTimeout(() => {
        setInitialRenderComplete(true);
      }, 100);
    } else if (canvasRef.current) {
      // For subsequent centering, use animation
      canvasRef.current.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      
      // Apply the zoom and pan directly
      setPan({ x: newPanX, y: newPanY });
      setZoom(fitScale);
      
      // After animation completes, reset to default transition
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      }, 600);
    }
  }, [containerRef, canvasRef]);

  // Load sample data initially
  useEffect(() => {
    setData(sampleData);
  }, []);
  
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

  // Redefine handleResetZoom to use centerView helper
  const handleResetZoom = useCallback(() => {
    if (data && Object.keys(nodePositions).length > 0) {
      centerView(nodePositions);
    }
  }, [data, nodePositions, centerView]);

  // CSS classes for selected status
  const getSelectionClassNames = (isSelected: boolean) => {
    return isSelected 
      ? 'ring-2 ring-blue-500 shadow-lg z-20' 
      : '';
  };

  // Register toggle button refs from NodeCard components
  const registerToggleButtonRef = useCallback((nodeId: string, ref: HTMLDivElement | null) => {
    setToggleButtonRefs(prev => {
      if (ref === null) {
        const newRefs = { ...prev };
        delete newRefs[nodeId];
        return newRefs;
      } else {
        return { ...prev, [nodeId]: ref };
      }
    });
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
      }, 250); // Match the animation duration
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
        }, 250); // Match the animation duration
      }, 50); // Small delay to ensure DOM updates
    }
  };

  // Get final node position (base + dragged delta)
  const getNodePosition = (nodeId: string) => {
    const basePos = nodePositions[nodeId] || { x: 0, y: 0 };
    const draggedPos = draggedPositions[nodeId] || { x: 0, y: 0 };
    
    return {
      x: basePos.x + draggedPos.x,
      y: basePos.y + draggedPos.y
    };
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
    
    // Get the delta from the last position
    const deltaX = lastDragPosition.current ? data.x - lastDragPosition.current.x : 0;
    const deltaY = lastDragPosition.current ? data.y - lastDragPosition.current.y : 0;
    
    // If this is a selected node and there are other selected nodes
    if (selectedNodes.includes(nodeId) && selectedNodes.length > 1) {
      // Update all selected nodes
      setDraggedPositions(prev => {
        const newPositions = { ...prev };
        
        // Move all selected nodes by the same delta
        selectedNodes.forEach(id => {
          const currentPos = prev[id] || { x: 0, y: 0 };
          newPositions[id] = {
            x: currentPos.x + deltaX,
            y: currentPos.y + deltaY
          };
        });
        
        return newPositions;
      });
    } else {
      // Just move this node - use direct position for immediate response
      setDraggedPositions(prev => ({
        ...prev,
        [nodeId]: { x: data.x, y: data.y }
      }));
    }
    
    // Update the last position
    lastDragPosition.current = { x: data.x, y: data.y };
  };

  // Handle card drag start
  const handleCardDragStart = () => {
    // Reset last position
    lastDragPosition.current = null;
  };

  // Handle card drag stop
  const handleCardDragStop = () => {
    // Reset last position
    lastDragPosition.current = null;
    
    // Reset the flag after a short delay
    setTimeout(() => {
      isCardBeingDragged.current = false;
    }, 50);
  };

  // Handle node updates (title, description)
  const handleNodeUpdate = (nodeId: string, updates: Partial<MindMapNode>) => {
    if (!data) return;
    
    // Create a new nodes array with the updated node
    const updatedNodes = data.nodes.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    );
    
    // Update the data state with the new nodes WITHOUT incrementing dataStructureVersion
    // since text edits shouldn't reset zoom/pan
    setData({
      ...data,
      nodes: updatedNodes
    });
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/papermap', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze paper');
      }

      const responseData: MindMapData = await response.json();
      setData(responseData);
      // Reset positions when loading new data
      setDraggedPositions({});
      // Don't set zoom directly here, let dataStructureVersion trigger it
      // setZoom(1);
      // Increment structure version to trigger zoom fit
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

  // Handle canvas drag (for panning) or box selection
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      
      // Check if we're clicking on a card or its children
      const isCard = target.closest('.node-card');
      
      if (!isCard) {
        // Get container's bounding rect to calculate correct relative coordinates
        const containerRect = containerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          // Calculate coordinates relative to the container
          const relativeX = e.clientX - containerRect.left;
          const relativeY = e.clientY - containerRect.top;
          
          // If shift key is pressed, start panning
          if (e.shiftKey || isShiftKeyDown) {
            setIsDragging(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          } else {
            // Otherwise, start box selection
            setIsBoxSelecting(true);
            // Store start point in container-relative coordinates
            setSelectionBox({
              startX: relativeX,
              startY: relativeY,
              endX: relativeX,
              endY: relativeY,
            });
          }
          e.preventDefault(); // Prevent text selection during drag
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // Handle panning
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      e.preventDefault();
    } else if (isBoxSelecting) {
      // Get container's bounding rect to calculate correct relative coordinates
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        // Calculate coordinates relative to the container
        const relativeX = e.clientX - containerRect.left;
        const relativeY = e.clientY - containerRect.top;
        
        // Update selection box end position
        setSelectionBox(prev => ({
          ...prev,
          endX: relativeX,
          endY: relativeY
        }));
        e.preventDefault();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setStartPan({ x: 0, y: 0 }); // Reset start pan position
    } else if (isBoxSelecting) {
      // Calculate which nodes are inside selection box
      if (data) {
        const boxLeft = Math.min(selectionBox.startX, selectionBox.endX);
        const boxRight = Math.max(selectionBox.startX, selectionBox.endX);
        const boxTop = Math.min(selectionBox.startY, selectionBox.endY);
        const boxBottom = Math.max(selectionBox.startY, selectionBox.endY);
        
        // Get container's bounding rect
        const canvasRect = containerRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const selectedIds: string[] = [];
          
          // Check each node to see if it's in the selection box
          data.nodes.forEach(node => {
            // Skip hidden nodes
            let isHidden = false;
            let currentNode = node;
            while (currentNode.parentId) {
              const parent = data.nodes.find(n => n.id === currentNode.parentId);
              if (!parent) break;
              if (hiddenChildren[parent.id]) {
                isHidden = true;
                break;
              }
              currentNode = parent;
            }
            
            if (isHidden) return;
            
            // Get node position in canvas coordinates
            const nodePos = getNodePosition(node.id);
            
            // Transform from canvas space to container space
            // We need to account for both zoom and pan
            const containerX = nodePos.x * zoom + pan.x;
            const containerY = nodePos.y * zoom + pan.y;
            
            // Calculate the center point of the node card for selection (150px is half width, 50px is approx half height)
            const nodeCenterX = containerX + 150;
            const nodeCenterY = containerY + 50;
            
            if (nodeCenterX >= boxLeft && nodeCenterX <= boxRight &&
                nodeCenterY >= boxTop && nodeCenterY <= boxBottom) {
              selectedIds.push(node.id);
            }
          });
          
          // Update selected nodes, keeping already selected nodes if shift is pressed
          if (e.shiftKey) {
            setSelectedNodes(prev => [...prev, ...selectedIds.filter(id => !prev.includes(id))]);
          } else {
            setSelectedNodes(selectedIds);
          }
        }
      }
      
      setIsBoxSelecting(false);
      setSelectionBox({ startX: 0, startY: 0, endX: 0, endY: 0 }); // Reset selection box
    }
  };

  // Calculate distance between two touch points
  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getCenter = (touch1: React.Touch, touch2: React.Touch): { x: number, y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: TouchEvent) => {
    // Handle pinch gesture (two fingers)
    if (e.touches.length === 2) {
      // Calculate initial distance between touches
      const distance = getDistance(e.touches[0], e.touches[1]);
      setTouchDistance(distance);
      
      // Calculate center point between touches
      const center = getCenter(e.touches[0], e.touches[1]);
      setTouchCenter(center);
      
      e.preventDefault();
      return;
    }
    
    // Handle pan gesture (one finger)
    const target = e.target as HTMLElement;
    
    // Check if we're touching a card or its children
    const isCard = target.closest('.node-card');
    
    if (!isCard) {
      isTouchDragging.current = true;
      
      // Get the first touch point
      const touch = e.touches[0];
      setStartPan({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      e.preventDefault(); // Prevent scrolling
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Handle pinch gesture (two fingers)
    if (e.touches.length === 2 && touchDistance !== null && touchCenter !== null) {
      // Ensure transitions are enabled for smooth zooming
      setInitialRenderComplete(true);
      
      // Calculate new distance between touches
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      
      // Calculate zoom factor based on the change in distance
      const factor = newDistance / touchDistance;
      
      // Apply a stronger dampening factor for smoother zooming
      const dampenedFactor = factor > 1 
        ? 1 + (factor - 1) * 0.25 // Reduced from 0.5 to 0.25 for more gentle zooming in
        : 1 - (1 - factor) * 0.25; // Reduced from 0.5 to 0.25 for more gentle zooming out
      
      setZoom(prev => {
        // For consistency with other zoom controls, limit the changes and prevent jumps
        if (dampenedFactor > 1) {
          // Zooming in - limit the increment
          return Math.min(prev * dampenedFactor, prev + 0.1);
        } else {
          // Zooming out - use proportional step with minimum to prevent jarring jumps
          const step = Math.max(0.05, prev * (1 - dampenedFactor));
          return Math.max(0.1, prev - step);
        }
      });
      
      // Update the reference distance to the new distance to prevent jumps
      setTouchDistance(newDistance);
      
      e.preventDefault();
      return;
    }
    
    // Handle pan gesture (one finger)
    if (isTouchDragging.current) {
      // Prevent default to stop scrolling
      e.preventDefault();
      
      // Get the first touch point
      const touch = e.touches[0];
      
      // Apply direct positioning without smoothing for responsive dragging
      setPan({
        x: touch.clientX - startPan.x,
        y: touch.clientY - startPan.y
      });
    }
  };

  const handleTouchEnd = () => {
    isTouchDragging.current = false;
    setTouchDistance(null);
    setTouchCenter(null);
  };

  // Handle wheel zoom with smoother increments
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Ensure transitions are enabled for smooth zooming
    setInitialRenderComplete(true);
    
    // Use proportional zooming like zoom buttons for consistency
    const direction = e.deltaY < 0 ? 1 : -1;
    
    setZoom(prev => {
      if (direction > 0) {
        // Zoom in - add a fixed small increment
        return Math.min(prev + 0.05, 2);
      } else {
        // Zoom out - use proportional step with minimum to prevent jarring jumps
        const step = Math.max(0.05, prev * 0.1);
        return Math.max(0.1, prev - step);
      }
    });
  }, [setInitialRenderComplete]);

  // Create connections
  const renderConnections = () => {
    if (!data) return null;
    
    return data.nodes
      .filter(node => {
        // Only include nodes with a parent
        if (!node.parentId) return false;
        
        // Check if this node is a descendant of any hidden node
        let currentNode = node;
        let isDescendantOfHiddenNode = false;
        
        // Traverse up the tree to check all ancestors
        while (currentNode.parentId) {
          const parent = data.nodes.find(n => n.id === currentNode.parentId);
          if (!parent) break;
          
          // If any ancestor has hidden children, don't show this connection
          if (hiddenChildren[parent.id]) {
            isDescendantOfHiddenNode = true;
            break;
          }
          
          // Move up to the parent
          currentNode = parent;
        }
        
        return !isDescendantOfHiddenNode;
      })
      .map(node => {
        const parent = data.nodes.find(n => n.id === node.parentId);
        if (!parent) return null;
        
        const parentPos = getNodePosition(parent.id);
        const nodePos = getNodePosition(node.id);
        
        // Determine if this line should be animating
        const isAnimating = animatingNodes[node.id];
        const isVisible = visibilityState[node.id] !== false;
        
        return (
          <Line
            key={`${parent.id}-${node.id}`}
            startPosition={parentPos}
            endPosition={nodePos}
            isParentExpanded={nodeExpanded[parent.id] || false}
            isChildExpanded={nodeExpanded[node.id] || false}
            parentToggleButtonRef={toggleButtonRefs[parent.id]}
            childToggleButtonRef={toggleButtonRefs[node.id]}
            isVisible={!isAnimating || isVisible}
            isDragging={isDragging || isCardBeingDragged.current}
          />
        );
      });
  };

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
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 bg-gray-50 relative overflow-hidden select-none"
        style={{ 
          cursor: isShiftKeyDown
            ? isDragging 
              ? 'grabbing' 
              : 'grab'
            : isBoxSelecting
              ? 'crosshair'
              : 'default',
          touchAction: 'none',
          width: '100%',
          height: '100%',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          outline: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Edge indicators */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-gray-300 to-transparent opacity-50 pointer-events-none" 
             style={{ display: pan.y < 0 ? 'block' : 'none' }} />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-300 to-transparent opacity-50 pointer-events-none" 
             style={{ display: pan.y > 0 ? 'block' : 'none' }} />
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-gray-300 to-transparent opacity-50 pointer-events-none" 
             style={{ display: pan.x < 0 ? 'block' : 'none' }} />
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-gray-300 to-transparent opacity-50 pointer-events-none" 
             style={{ display: pan.x > 0 ? 'block' : 'none' }} />
        
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
        <InfoTip visible={showTip} onClose={() => setShowTip(false)} />
        
        {/* Selection counter */}
        {selectedNodes.length > 0 && (
          <div className="absolute bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] right-2 bg-blue-500 text-white px-3 py-1 rounded-lg shadow-md text-sm font-medium z-50 flex items-center space-x-2 animate-fadeIn">
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
        
        <div 
          ref={canvasRef}
          className="pointer-events-auto absolute inset-0 select-none" 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            minWidth: '100%',
            minHeight: '100%',
            width: '8000px',  // Provide large canvas area
            height: '6000px', // Provide large canvas area
            position: 'absolute',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            outline: 'none',
            // Enable transitions once initial rendering is complete, but disable during dragging
            transition: isDragging || isCardBeingDragged.current
              ? 'none'
              : initialRenderComplete ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        >
          {/* SVG for connections */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 5,
              pointerEvents: 'none', // Allows clicking through to the containers
              overflow: 'visible', // Allow lines to extend beyond SVG boundaries
            }}
          >
            {renderConnections()}
          </svg>
          
          {/* Render nodes */}
          {data?.nodes
            .filter(node => {
              // Always show root nodes
              if (!node.parentId) return true;
              
              // Check if this node is a descendant of any hidden node
              let currentNode = node;
              let isDescendantOfHiddenNode = false;
              
              // Traverse up the tree to check all ancestors
              while (currentNode.parentId) {
                const parent = data.nodes.find(n => n.id === currentNode.parentId);
                if (!parent) break;
                
                // If any ancestor has hidden children, don't show this node
                if (hiddenChildren[parent.id]) {
                  isDescendantOfHiddenNode = true;
                  break;
                }
                
                // Move up to the parent
                currentNode = parent;
              }
              
              return !isDescendantOfHiddenNode;
            })
            .map(node => {
              const basePosition = nodePositions[node.id] || { x: 0, y: 0 };
              const draggedPosition = draggedPositions[node.id] || { x: 0, y: 0 };
              const isExpanded = nodeExpanded[node.id] || false;
              const areChildrenHidden = hiddenChildren[node.id] || false;
              const hasChildren = data.nodes.some(n => n.parentId === node.id);
              const isSelected = selectedNodes.includes(node.id);
              
              // Determine if this node should be animating
              const isAnimating = animatingNodes[node.id];
              const isVisible = visibilityState[node.id] !== false;
              
              // Custom node styles to override the default ones in NodeCard
              const customStyles = isAnimating ? {
                transform: isVisible 
                  ? 'translateX(0) scale(1)' 
                  : showingAnimation[node.id] 
                    ? 'translateX(-30px) scale(0.98)' // Coming in from left (will animate to translateX(0))
                    : 'translateX(30px) scale(0.98)'  // Going out to right
              } : undefined;
              
              // Apply an additional class for selection status
              const selectionClass = getSelectionClassNames(isSelected);
              
              return (
                <div key={node.id} className={selectionClass}>
                  <NodeCard
                    node={node}
                    basePosition={basePosition}
                    draggedPosition={draggedPosition}
                    isExpanded={isExpanded}
                    hasChildren={hasChildren}
                    areChildrenHidden={areChildrenHidden}
                    onDrag={handleDrag}
                    onDragStart={handleCardDragStart}
                    onToggleExpand={toggleNode}
                    onToggleChildren={toggleChildrenVisibility}
                    onDragStop={handleCardDragStop}
                    onUpdateNode={handleNodeUpdate}
                    onSelect={handleCardSelect}
                    isSelected={isSelected}
                    registerToggleButtonRef={registerToggleButtonRef}
                    isVisible={!isAnimating || isVisible}
                    style={customStyles}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

