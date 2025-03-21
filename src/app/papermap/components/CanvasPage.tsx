import React, { useState, useRef, useCallback, useEffect, TouchEvent } from 'react';
import { MindMapData, MindMapNode, NodePosition } from './MindMapTypes';
import NodeCard from './NodeCard';
import QnACard from './QnACard';
import Line from './Line';

interface CanvasPageProps {
  data: MindMapData | null;
  nodePositions: Record<string, NodePosition>;
  draggedPositions: Record<string, NodePosition>;
  nodeExpanded: Record<string, boolean>;
  hiddenChildren: Record<string, boolean>;
  selectedNodes: string[];
  visibilityState?: Record<string, boolean>;
  onNodeUpdate: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onNodeSelect: (nodeId: string, e: React.MouseEvent) => void;
  onNodeDrag: (nodeId: string, e: any, data: { x: number, y: number }) => void;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;
  onToggleExpand: (id: string) => void;
  onToggleChildren: (id: string) => void;
  onNodeResize: (nodeId: string, width: number, height: number) => void;
  registerToggleButtonRef: (nodeId: string, ref: HTMLDivElement | null) => void;
  zoom?: number;
  onZoom?: (zoomDelta: number) => void;
  pan?: { x: number, y: number };
  onPan?: (newPan: { x: number, y: number }) => void;
  children?: React.ReactNode;
  className?: string;
  mindmapContainerRef: React.RefObject<HTMLDivElement | null>;
  onAskFollowUp?: (nodeId: string) => void;
}

export default function CanvasPage({
  data,
  nodePositions,
  draggedPositions,
  nodeExpanded,
  hiddenChildren,
  selectedNodes,
  visibilityState = {},
  onNodeUpdate,
  onNodeSelect,
  onNodeDrag,
  onNodeDragStart,
  onNodeDragStop,
  onToggleExpand,
  onToggleChildren,
  onNodeResize,
  registerToggleButtonRef,
  zoom = 0.9,
  onZoom,
  pan = { x: 0, y: 0 },
  onPan,
  children,
  className = '',
  mindmapContainerRef,
  onAskFollowUp
}: CanvasPageProps) {
  const [localZoom, setLocalZoom] = useState(0.9);
  const effectiveZoom = zoom ?? localZoom;
  const [localPan, setLocalPan] = useState({ x: 0, y: 0 });
  const effectivePan = pan ?? localPan;
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);
  const [animatingNodes, setAnimatingNodes] = useState<Record<string, boolean>>({});
  const [showingAnimation, setShowingAnimation] = useState<Record<string, boolean>>({});
  const isCardBeingDragged = useRef<boolean>(false);
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(true);

  // Add touch state for pinch zoom
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [touchZoomStart, setTouchZoomStart] = useState<number>(1);

  // Add state for container dimensions
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });

  // Add new state for description heights
  const [nodeDescriptionHeights, setNodeDescriptionHeights] = useState<Record<string, number>>({});

  // Auto-fit the mindmap when component mounts or data changes
  useEffect(() => {
    if (data && Object.keys(nodePositions).length > 0) {
      // Set initialRenderComplete immediately
      setInitialRenderComplete(true);
    }
  }, [data, nodePositions]);

  // Also set initialRenderComplete when zoom or pan changes
  useEffect(() => {
    setInitialRenderComplete(true);
  }, [zoom, pan]);

  // Track node width changes
  useEffect(() => {
    if (data) {
      const defaultWidths: Record<string, number> = {};
      data.nodes.forEach(node => {
        defaultWidths[node.id] = nodeWidths[node.id] || 250; // Default node width is 250px
      });
      setNodeWidths(prev => ({...prev, ...defaultWidths}));
    }
  }, [data]);

  // Modify the container dimensions effect to track calculation state
  useEffect(() => {
    if (!data || Object.keys(nodePositions).length === 0) {
      setIsCalculatingLayout(true);
      return;
    }

    setIsCalculatingLayout(true);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Calculate absolute bounds including dragged positions
    Object.entries(nodePositions).forEach(([nodeId, pos]) => {
      const draggedPos = draggedPositions[nodeId] || { x: 0, y: 0 };
      const totalX = pos.x + draggedPos.x;
      const totalY = pos.y + draggedPos.y;
      const width = nodeWidths[nodeId] || 250;
      
      const isNodeExpanded = nodeExpanded[nodeId] || false;
      const descriptionHeight = nodeDescriptionHeights[nodeId] || 100;
      const height = isNodeExpanded ? (80 + descriptionHeight) : 80;

      minX = Math.min(minX, totalX);
      maxX = Math.max(maxX, totalX + width);
      minY = Math.min(minY, totalY);
      maxY = Math.max(maxY, totalY + height);
    });

    const padding = {
      top: 60,
      right: 60,
      bottom: 0,
      left: 60
    };

    const absoluteWidth = Math.max(maxX + padding.right, Math.abs(minX) + maxX + padding.left + padding.right);
    const absoluteHeight = Math.max(maxY + padding.bottom, Math.abs(minY) + maxY + padding.top + padding.bottom);

    setContainerDimensions({ 
      width: absoluteWidth,
      height: absoluteHeight,
      offsetX: minX - padding.left,
      offsetY: minY - padding.top
    });

    // Mark calculations as complete
    setIsCalculatingLayout(false);
  }, [data, nodePositions, draggedPositions, nodeWidths, nodeExpanded, nodeDescriptionHeights]);

  // Get final node position without any transformations
  const getNodePosition = (nodeId: string) => {
    return nodePositions[nodeId] || { x: 0, y: 0 };
  };

  // Handle canvas drag (for panning)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isCard = target.closest('.node-card') || target.closest('.qna-card');
      
      if (!isCard) {
        setIsDragging(true);
        setStartPan({ x: e.clientX - effectivePan.x, y: e.clientY - effectivePan.y });
        e.preventDefault();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPan = {
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      };
      
      if (onPan) {
        onPan(newPan);
      } else {
        setLocalPan(newPan);
      }
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setStartPan({ x: 0, y: 0 });
  };

  // Calculate distance between two touch points
  const getTouchDistance = (e: TouchEvent) => {
    if (e.touches.length < 2) return null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch events for pinch zoom
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e);
      setTouchDistance(distance);
      setTouchZoomStart(effectiveZoom);
      e.preventDefault(); // Prevent default zoom behavior
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && touchDistance) {
      const newDistance = getTouchDistance(e);
      if (newDistance) {
        const scale = newDistance / touchDistance;
        const newZoom = Math.min(Math.max(touchZoomStart * scale, 0.1), 2);
        
        if (onZoom) {
          // Convert the absolute zoom to a relative change
          const zoomDelta = newZoom > effectiveZoom ? 1 : -1;
          onZoom(zoomDelta);
        } else {
          setLocalZoom(newZoom);
        }
      }
      e.preventDefault(); // Prevent default zoom behavior
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
    setTouchZoomStart(1);
  };

  // Improved wheel zoom handler with smoother steps
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Determine zoom direction
    const direction = e.deltaY < 0 ? 1 : -1;
    
    if (onZoom) {
      onZoom(direction);
    } else {
      setLocalZoom(prev => {
        const step = prev > 1 ? 0.1 : 0.05;
        return direction > 0 
          ? Math.min(prev + step, 2)
          : Math.max(prev - step, 0.1);
      });
    }
  }, [onZoom]);

  // Helper function to check if a node is a descendant of a hidden node
  const isNodeDescendantOfHidden = useCallback((nodeId: string): boolean => {
    if (!data) return false;
    
    let currentNode = data.nodes.find(n => n.id === nodeId);
    if (!currentNode) return false;
    
    // Check if the node's immediate parent has hidden children
    // This will apply to QnA nodes as well
    if (currentNode.parentId && hiddenChildren[currentNode.parentId]) {
      return true;
    }
    
    // For non-QnA nodes, also check if any ancestor is hidden
    if (currentNode.type !== 'qna') {
      let nodeToCheck: MindMapNode = currentNode;
      
      while (nodeToCheck.parentId) {
        const parent = data.nodes.find(n => n.id === nodeToCheck.parentId);
        if (!parent) break;
        
        // If any ancestor higher up has hidden children, this node is hidden
        // Skip the immediate parent as we already checked it above
        if (parent.id !== currentNode.parentId && hiddenChildren[parent.id]) {
          return true;
        }
        
        nodeToCheck = parent;
      }
    }
    
    return false;
  }, [data, hiddenChildren]);

  // Render connections between nodes
  const renderConnections = useCallback(() => {
    if (!data) return null;
    
    const connections: React.ReactNode[] = [];
    
    // Force a unique key for the connections container when dragging to ensure re-rendering
    const dragKey = isCardBeingDragged.current ? Date.now() : 'default';
    
    data.nodes.forEach((node) => {
      if (node.parentId) {
        const parent = data.nodes.find(n => n.id === node.parentId);
        if (!parent) return;
        
        // Check if node is hidden based on parent state
        const isNodeHidden = isNodeDescendantOfHidden(node.id);
        const isParentHidden = isNodeDescendantOfHidden(parent.id);
        
        // Skip rendering the connection if either node should be hidden
        if (isNodeHidden || isParentHidden) return;
        
        // Get the base positions from nodePositions
        const parentBasePos = nodePositions[parent.id] || { x: 0, y: 0 };
        const nodeBasePos = nodePositions[node.id] || { x: 0, y: 0 };
        
        // Get the dragged offsets from draggedPositions
        const parentDragPos = draggedPositions[parent.id] || { x: 0, y: 0 };
        const nodeDragPos = draggedPositions[node.id] || { x: 0, y: 0 };
        
        // Final positions are base + dragged
        const parentPos = {
          x: parentBasePos.x + parentDragPos.x,
          y: parentBasePos.y + parentDragPos.y
        };
        
        const nodePos = {
          x: nodeBasePos.x + nodeDragPos.x,
          y: nodeBasePos.y + nodeDragPos.y
        };
        
        // Get width of parent node for line positioning
        const parentWidth = nodeWidths[parent.id] || 250; // Default width
        
        const isParentExpanded = nodeExpanded[parent.id] || false;
        const isNodeExpanded = nodeExpanded[node.id] || false;
        
        // Check if line should be visible based on the animation state of its nodes
        const isNodeAnimating = node.id in animatingNodes;
        const isParentAnimating = parent.id in animatingNodes;
        
        const isShowingNode = node.id in showingAnimation ? showingAnimation[node.id] : true;
        const isShowingParent = parent.id in showingAnimation ? showingAnimation[parent.id] : true;
        
        const isLineVisible = 
          (!isNodeAnimating || isShowingNode) && 
          (!isParentAnimating || isShowingParent);
        
        // Check if either node is being dragged
        const isDraggingNode = Boolean(nodeDragPos.x !== 0 || nodeDragPos.y !== 0 || parentDragPos.x !== 0 || parentDragPos.y !== 0);
        
        // Create a dynamic key that includes drag state to force re-renders during drag
        const key = isCardBeingDragged.current ? 
          `${parent.id}-${node.id}-${dragKey}` : 
          `${parent.id}-${node.id}`;
        
        connections.push(
          <Line 
            key={key}
            startPosition={parentPos}
            endPosition={nodePos}
            isParentExpanded={isParentExpanded}
            isChildExpanded={isNodeExpanded}
            isVisible={isLineVisible}
            isDragging={isCardBeingDragged.current || isDraggingNode}
            nodeWidth={parentWidth}
          />
        );
      }
    });
    
    return connections;
  }, [data, nodePositions, draggedPositions, nodeWidths, hiddenChildren, nodeExpanded, animatingNodes, showingAnimation, isNodeDescendantOfHidden, isCardBeingDragged]);

  // Update the onNodeResize handler to be more responsive
  const handleNodeResize = useCallback((nodeId: string, width: number) => {
    // Set this node as currently being resized
    setResizingNodeId(nodeId);
    
    // Update nodeWidths immediately
    setNodeWidths(prev => ({
      ...prev,
      [nodeId]: width
    }));
  }, []);

  useEffect(() => {
    // Update transitions whenever zoom changes
    if (canvasRef.current && initialRenderComplete) {
      // Apply smooth transition when zoom changes
      canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }, [zoom, initialRenderComplete]);

  useEffect(() => {
    // Update transitions whenever pan changes
    if (canvasRef.current && initialRenderComplete && !isDragging) {
      const innerContainer = canvasRef.current.querySelector('.absolute.inset-0');
      if (innerContainer) {
        // Apply smooth transition when pan changes
        (innerContainer as HTMLElement).style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
    }
  }, [pan, initialRenderComplete, isDragging]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
        {isCalculatingLayout ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Container for the mindmap with panning and zooming */}
            <div 
              ref={mindmapContainerRef}
              className="absolute border bg-white rounded-lg"
              style={{
                width: `${containerDimensions.width}px`,
                height: `${containerDimensions.height}px`,
                transform: `translate(${effectivePan.x}px, ${effectivePan.y}px) scale(${effectiveZoom})`,
                transformOrigin: '0 0',
                transition: isDragging || !initialRenderComplete 
                  ? 'none' 
                  : 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                overflow: 'visible',
                backgroundColor: '#ffffff',
                position: 'absolute',
                willChange: 'transform',
                minWidth: '100%',
                minHeight: '100%'
              }}
            >
              {/* SVG for connections - Render FIRST */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  overflow: 'visible',
                  width: '100%',
                  height: '100%',
                  zIndex: 1,
                  willChange: 'transform',
                  position: 'absolute',
                  left: 0,
                  top: 0
                }}
                key={`svg-container-${isCardBeingDragged.current ? Date.now() : (resizingNodeId || 'default')}`}
              >
                <g transform={`translate(${-containerDimensions.offsetX}, ${-containerDimensions.offsetY})`}>
                  {renderConnections()}
                </g>
              </svg>
              
              {/* Container for nodes - Render SECOND, so it appears above lines */}
              <div 
                className="absolute inset-0" 
                style={{ 
                  overflow: 'visible',
                  transform: `translate(${-containerDimensions.offsetX}px, ${-containerDimensions.offsetY}px)`,
                  width: '100%',
                  height: '100%',
                  willChange: 'transform',
                  position: 'absolute',
                  minWidth: '100%',
                  minHeight: '100%',
                  zIndex: 2, // Ensure nodes container is above SVG
                  transition: isDragging || !initialRenderComplete 
                    ? 'none' 
                    : 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
                }}
              >
                {/* Render regular nodes first */}
                {data?.nodes
                  .filter(node => {
                    // For all nodes, check if they're descendants of hidden nodes
                    if (!node.parentId) return true; // Root nodes are always visible
                    
                    // Check if this node should be hidden due to a collapsed parent
                    const shouldHide = isNodeDescendantOfHidden(node.id);
                    
                    return !shouldHide;
                  })
                  .filter(node => node.type !== 'qna') // Filter out QnA nodes for this section
                  .map(node => {
                    const position = getNodePosition(node.id);
                    const isExpanded = nodeExpanded[node.id] || false;
                    const areChildrenHidden = hiddenChildren[node.id] || false;
                    const hasChildren = data.nodes.some(n => n.parentId === node.id);
                    const isSelected = selectedNodes.includes(node.id);
                    const isVisible = node.id in visibilityState ? visibilityState[node.id] : true;
                    
                    // Regular nodes use NodeCard component
                    return (
                      <NodeCard
                        key={node.id}
                        node={node}
                        basePosition={position}
                        draggedPosition={draggedPositions[node.id] || {x: 0, y: 0}}
                        isExpanded={isExpanded}
                        hasChildren={hasChildren}
                        areChildrenHidden={areChildrenHidden}
                        onDrag={onNodeDrag}
                        onDragStart={onNodeDragStart}
                        onToggleExpand={onToggleExpand}
                        onToggleChildren={onToggleChildren}
                        onDragStop={onNodeDragStop}
                        onUpdateNode={onNodeUpdate}
                        onSelect={onNodeSelect}
                        isSelected={isSelected}
                        registerToggleButtonRef={registerToggleButtonRef}
                        onResize={handleNodeResize}
                        onAskFollowUp={onAskFollowUp}
                        isVisible={isVisible}
                      />
                    );
                  })}
                
                {/* Render QnA nodes second and in a separate section to ensure they appear on top */}
                {data?.nodes
                  .filter(node => {
                    if (node.type !== 'qna') return false;
                    
                    // Check if this QnA node should be hidden due to a collapsed parent
                    if (!node.parentId) return true;
                    const shouldHide = isNodeDescendantOfHidden(node.id);
                    return !shouldHide;
                  })
                  .map(node => {
                    const position = getNodePosition(node.id);
                    const isSelected = selectedNodes.includes(node.id);
                    
                    // QnA nodes use QnACard component
                    return (
                      <QnACard
                        key={node.id}
                        node={node}
                        basePosition={position}
                        draggedPosition={draggedPositions[node.id] || {x: 0, y: 0}}
                        onDrag={onNodeDrag}
                        onDragStart={onNodeDragStart}
                        onDragStop={onNodeDragStop}
                        onUpdateNode={onNodeUpdate}
                        onSelect={onNodeSelect}
                        isSelected={isSelected}
                        onResize={handleNodeResize}
                      />
                    );
                  })}
              </div>
            </div>
            
            {/* Render children (zoom controls, etc.) */}
            {children}
          </>
        )}
    </div>
  );
} 