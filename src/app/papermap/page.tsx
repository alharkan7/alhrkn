'use client';

import React, { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import NodeCard from './components/NodeCard';
import Uploader from './components/Uploader';
import Line from './components/Line';
import { FitToViewIcon } from './components/Icons';
import { MindMapData, MindMapNode, COLUMN_WIDTH, NODE_VERTICAL_SPACING, sampleData, NodePosition } from './components/MindMapTypes';

export default function PaperMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeExpanded, setNodeExpanded] = useState<Record<string, boolean>>({});
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggedPositions, setDraggedPositions] = useState<Record<string, NodePosition>>({});
  const [hiddenChildren, setHiddenChildren] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1);
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
      }
    }
  }, [data, dataStructureVersion]);

  // Load sample data initially
  useEffect(() => {
    setData(sampleData);
    // Trigger centering after initial load
    setTimeout(() => {
      setDataStructureVersion(1);
    }, 500);
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
  
  // Center view ONLY when explicitly triggered by dataStructureVersion
  useEffect(() => {
    if (dataStructureVersion > 0 && data && containerRef.current) {
      const container = containerRef.current;
      
      // Timeout to ensure the container has been measured
      setTimeout(() => {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calculate mindmap bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        Object.values(nodePositions).forEach(pos => {
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
        
        // Apply centering and scaling
        setPan({ x: newPanX, y: newPanY });
        setZoom(fitScale);
      }, 100);
    }
  }, [dataStructureVersion, nodePositions, containerRef, data]);

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

  // Handle card drag
  const handleDrag = (nodeId: string, e: any, data: { x: number, y: number }) => {
    isCardBeingDragged.current = true;
    setDraggedPositions(prev => ({
      ...prev,
      [nodeId]: { x: data.x, y: data.y }
    }));
  };

  // Handle card drag stop
  const handleCardDragStop = () => {
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
      setZoom(1);
      // Increment structure version to trigger zoom fit
      setDataStructureVersion(prev => prev + 1);
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));
  const handleResetZoom = () => {
    // Increment dataStructureVersion to trigger the useEffect that fits everything to view
    setDataStructureVersion(prev => prev + 1);
  };

  // Handle canvas drag (for panning)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning when clicking on the container or canvas, but not on cards
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      
      // Check if we're clicking on a card or its children
      const isCard = target.closest('.node-card');
      
      if (!isCard) {
        setIsDragging(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        e.preventDefault(); // Prevent text selection during drag
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
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
      // Calculate new distance between touches
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      
      // Calculate zoom factor based on the change in distance
      const factor = newDistance / touchDistance;
      
      // Calculate new zoom level
      const newZoom = Math.max(0.5, Math.min(2, zoom * factor));
      
      // Update zoom if it changed significantly
      if (Math.abs(newZoom - zoom) > 0.01) {
        setZoom(newZoom);
        setTouchDistance(newDistance);
      }
      
      e.preventDefault();
      return;
    }
    
    // Handle pan gesture (one finger)
    if (isTouchDragging.current) {
      // Prevent default to stop scrolling
      e.preventDefault();
      
      // Get the first touch point
      const touch = e.touches[0];
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

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
    setZoom(newZoom);
  };

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
          />
        );
      });
  };

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
        className="flex-1 bg-gray-50 relative overflow-hidden"
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab', 
          touchAction: 'none',
          width: '100%',
          height: '100%'
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
        
        {/* Zoom controls - moved to bottom left corner and arranged vertically */}
        <div className="absolute bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-2 flex flex-col space-y-2 bg-white bg-opacity-90 p-2 rounded-lg shadow-md z-50">
          <button 
            onClick={handleZoomIn}
            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
            title="Zoom In"
          >
            <span className="text-lg font-bold">+</span>
          </button>
          <button 
            onClick={handleResetZoom}
            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
            title="Fit to View"
          >
            <FitToViewIcon />
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
            title="Zoom Out"
          >
            <span className="text-lg font-bold">-</span>
          </button>
        </div>
        
        <div 
          ref={canvasRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '5000px',
            height: '3000px',
            position: 'relative',
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
              
              return (
                <NodeCard
                  key={node.id}
                  node={node}
                  basePosition={basePosition}
                  draggedPosition={draggedPosition}
                  isExpanded={isExpanded}
                  hasChildren={hasChildren}
                  areChildrenHidden={areChildrenHidden}
                  onDrag={handleDrag}
                  onToggleExpand={toggleNode}
                  onToggleChildren={toggleChildrenVisibility}
                  onDragStop={handleCardDragStop}
                  onUpdateNode={handleNodeUpdate}
                  registerToggleButtonRef={registerToggleButtonRef}
                  isVisible={!isAnimating || isVisible}
                  style={customStyles}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

