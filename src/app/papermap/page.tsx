'use client';

import React, { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import Uploader from './components/Uploader';
import { MindMapData, MindMapNode, COLUMN_WIDTH, NODE_VERTICAL_SPACING, sampleData, NodePosition } from './components/MindMapTypes';
import InfoTip from './components/InfoTip';
import ZoomControls from './components/ZoomControls';
import DownloadOptions from './components/DownloadOptions';
import CanvasPage from './components/CanvasPage';

export default function PaperMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeExpanded, setNodeExpanded] = useState<Record<string, boolean>>({});
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggedPositions, setDraggedPositions] = useState<Record<string, NodePosition>>({});
  const [hiddenChildren, setHiddenChildren] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
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
  
  // Track if initial rendering is complete to enable transitions
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);

  // Add fileName state
  const [fileName, setFileName] = useState<string>("mindmap");

  // Add state to track node widths
  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({});

  // Handle zoom controls with smaller increments for smoother zooming
  const handleZoomIn = useCallback(() => {
    setInitialRenderComplete(true);
    
    // Apply direct transition to canvas for smooth animation
    if (canvasRef.current) {
      canvasRef.current.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)';
    }
    
    // Calculate target zoom with easing
    setZoom(prev => {
      const target = Math.min(prev + 0.05, 2);
      return target;
    });
    
    // Reset transition after animation
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      }
    }, 200);
  }, [canvasRef, setInitialRenderComplete]);
  
  const handleZoomOut = useCallback(() => {
    setInitialRenderComplete(true);
    
    // Apply direct transition to canvas for smooth animation
    if (canvasRef.current) {
      canvasRef.current.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)';
    }
    
    // Calculate target zoom with easing
    setZoom(prev => {
      const step = Math.max(0.05, prev * 0.1);
      const target = Math.max(0.1, prev - step);
      return target;
    });
    
    // Reset transition after animation
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      }
    }, 200);
  }, [canvasRef, setInitialRenderComplete]);

  // Handle zoom from wheel or other sources
  const handleZoom = useCallback((direction: number) => {
    setInitialRenderComplete(true);
    
    // Apply direct transition to canvas for smoother wheel zoom
    if (canvasRef.current) {
      canvasRef.current.style.transition = 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)';
    }
    
    setZoom(prev => {
      if (direction > 0) {
        return Math.min(prev + 0.05, 2);
      } else {
        const step = Math.max(0.05, prev * 0.1);
        return Math.max(0.1, prev - step);
      }
    });
    
    // Reset transition after animation
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      }
    }, 150);
  }, [canvasRef, setInitialRenderComplete]);

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
            x: 50, // Add some left margin for root nodes
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
    
    // Calculate mindmap bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.values(positions).forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + 250); // 250px is card width (reduced from 300)
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + 80); // 80px is approx card height (reduced from 100)
    });
    
    // Add padding
    const padding = 100;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;
    
    // Calculate mindmap dimensions
    const mindmapWidth = maxX - minX;
    const mindmapHeight = maxY - minY;
    
    // Calculate the scale needed to fit the entire mindmap
    const scaleX = containerWidth / mindmapWidth;
    const scaleY = containerHeight / mindmapHeight;
    const fitScale = Math.min(scaleX, scaleY) * 0.85; // 85% to add some padding
    
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
    } else {
      // For subsequent centering, use animation
      // Always ensure transitions are enabled for fit to view
      setInitialRenderComplete(true);
      
      if (canvasRef.current) {
        canvasRef.current.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      }
      
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
    console.log("Fit to view button clicked - matching initial zoom behavior");
    
    // Basic validation
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.log("No data available");
      return;
    }

    // Force layout calculation to ensure proper measurements
    document.body.getBoundingClientRect();

    // Get the container dimensions directly from the DOM
    const container = document.querySelector('.flex-1.overflow-hidden');
    if (!container) {
      console.log("Container not found");
      return;
    }
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    console.log("Container dimensions:", containerWidth, containerHeight);
    
    // Calculate bounds of all nodes
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    
    // Use node positions directly
    Object.entries(nodePositions).forEach(([id, pos]) => {
      const nodeWidth = 250; // Default width
      const nodeHeight = 80; // Default height
      
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + nodeWidth);
      maxY = Math.max(maxY, pos.y + nodeHeight);
    });
    
    // Add padding - matching initial load behavior
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Calculate mindmap dimensions
    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    console.log("Map dimensions:", mapWidth, mapHeight);
    
    if (mapWidth <= 0 || mapHeight <= 0) {
      console.log("Invalid map dimensions");
      return;
    }
    
    // Calculate appropriate zoom level - matched to initial behavior (85% padding)
    const scaleX = containerWidth / mapWidth;
    const scaleY = containerHeight / mapHeight;
    const newZoom = Math.min(scaleX, scaleY) * 1.45; // Match the 0.85 scale factor from centerView
    
    console.log("Calculated new zoom:", newZoom);
    
    // Calculate pan to center the content - same formula as in centerView
    const newPanX = (containerWidth - mapWidth * newZoom) / 2 - minX * newZoom;
    const newPanY = (containerHeight - mapHeight * newZoom) / 2 - minY * newZoom;
    
    console.log("Calculated new pan:", { x: newPanX, y: newPanY });
    
    // Force enable transitions
    setInitialRenderComplete(true);
    
    // Set the values with explicit DOM manipulation for canvas element
    const canvasElement = document.querySelector('.relative.bg-white.shadow-lg.rounded-lg');
    const panElement = canvasElement?.querySelector('.absolute.inset-0');
    
    if (canvasElement) {
      console.log("Setting transitions on canvas element");
      (canvasElement as HTMLElement).style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
    }
    
    if (panElement) {
      console.log("Setting transitions on pan element");
      (panElement as HTMLElement).style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
    }
    
    // Set the zoom first
    setZoom(newZoom);
    
    // Set the pan after a small delay
    setTimeout(() => {
      setPan({ x: newPanX, y: newPanY });
      
      // Reset transitions after the animation completes
      setTimeout(() => {
        if (canvasElement) {
          (canvasElement as HTMLElement).style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
        }
        
        if (panElement) {
          (panElement as HTMLElement).style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
        }
      }, 1000);
    }, 50);
  }, [data, nodePositions, setInitialRenderComplete]);

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
    
    // Directly use the data position for draggedPositions
    // This ensures the card follows exactly the mouse pointer
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
    
    // Update the last position for the next drag event
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
      
      // Apply all dragged positions to base positions
      Object.entries(draggedPositions).forEach(([id, pos]) => {
        const basePos = prevNodePositions[id] || { x: 0, y: 0 };
        newPositions[id] = {
          x: basePos.x + pos.x,
          y: basePos.y + pos.y
        };
      });
      
      return newPositions;
    });
    
    // Clear all dragged positions
    setDraggedPositions({});
    
    // Reset last position
    lastDragPosition.current = null;
    
    // Using a sequence of delayed operations to ensure proper rendering
    requestAnimationFrame(() => {
      // First frame: leave transitions disabled
      
      // Schedule second frame for position settling
      requestAnimationFrame(() => {
        // Second frame: still leave transitions disabled
        
        // Schedule final cleanup after significant delay
        setTimeout(() => {
          // Remove the global style element after positions have settled
          const styleElement = document.getElementById('disable-all-transitions');
          if (styleElement) {
            document.head.removeChild(styleElement);
          }
          
          // Restore canvas transitions
          if (canvasRef.current) {
            canvasRef.current.style.transition = initialRenderComplete ? 
              'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
          }
          
          // Reset the flag after positions have fully settled
          isCardBeingDragged.current = false;
        }, 350); // Extra long delay to ensure everything is settled
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

  // Modify handleFileUpload to maintain uploaded data
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    
    const originalFileName = file.name;
    setFileName(originalFileName);

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
          containerRef={canvasRef}
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
          onNodeUpdate={handleNodeUpdate}
          onNodeSelect={handleCardSelect}
          onNodeDrag={handleDrag}
          onNodeDragStart={handleCardDragStart}
          onNodeDragStop={handleCardDragStop}
          onToggleExpand={toggleNode}
          onToggleChildren={toggleChildrenVisibility}
          onNodeResize={handleNodeResize}
          registerToggleButtonRef={registerToggleButtonRef}
          zoom={zoom}
          onZoom={handleZoom}
          pan={pan}
          onPan={setPan}
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
        </CanvasPage>
      </div>
    </div>
  );
}

