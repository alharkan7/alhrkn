import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MindMapData, MindMapNode, NodePosition } from './MindMapTypes';
import NodeCard from './NodeCard';
import Line from './Line';

interface CanvasPageProps {
  data: MindMapData | null;
  nodePositions: Record<string, NodePosition>;
  draggedPositions: Record<string, NodePosition>;
  nodeExpanded: Record<string, boolean>;
  hiddenChildren: Record<string, boolean>;
  selectedNodes: string[];
  onNodeUpdate: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onNodeSelect: (nodeId: string, e: React.MouseEvent) => void;
  onNodeDrag: (nodeId: string, e: any, data: { x: number, y: number }) => void;
  onNodeDragStart: () => void;
  onNodeDragStop: () => void;
  onToggleExpand: (id: string) => void;
  onToggleChildren: (id: string) => void;
  onNodeResize: (nodeId: string, width: number) => void;
  registerToggleButtonRef: (nodeId: string, ref: HTMLDivElement | null) => void;
  zoom?: number;
  onZoom?: (zoomDelta: number) => void;
  pan?: { x: number, y: number };
  onPan?: (newPan: { x: number, y: number }) => void;
  children?: React.ReactNode;
  className?: string;
}

export default function CanvasPage({
  data,
  nodePositions,
  draggedPositions,
  nodeExpanded,
  hiddenChildren,
  selectedNodes,
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
  className = ''
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

  // Auto-fit the mindmap when component mounts or data changes
  useEffect(() => {
    if (data && Object.keys(nodePositions).length > 0) {
      // Only set initialRenderComplete without changing zoom
      // This prevents the unwanted auto-zoom after first load
      setTimeout(() => {
        setInitialRenderComplete(true);
      }, 500);
    }
  }, [data, nodePositions]);

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

  // Calculate mindmap bounds and scale
  const calculateMindmapScale = useCallback(() => {
    if (!data || Object.keys(nodePositions).length === 0) return { scale: 0.9, offset: { x: 0, y: 0 } };

    // Calculate mindmap bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.entries(nodePositions).forEach(([nodeId, pos]) => {
      const draggedPos = draggedPositions[nodeId] || { x: 0, y: 0 };
      const totalX = pos.x + draggedPos.x;
      const totalY = pos.y + draggedPos.y;
      const width = nodeWidths[nodeId] || 250; // Default node width is 250px
      const height = 80; // Default node height is 80px

      minX = Math.min(minX, totalX);
      maxX = Math.max(maxX, totalX + width);
      minY = Math.min(minY, totalY);
      maxY = Math.max(maxY, totalY + height);
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

    // Get canvas dimensions
    const canvasWidth = canvasRef.current?.clientWidth || 1123; // A4 landscape width in pixels
    const canvasHeight = canvasRef.current?.clientHeight || 794; // A4 landscape height in pixels

    // Calculate scale to fit
    const scaleX = canvasWidth / mindmapWidth;
    const scaleY = canvasHeight / mindmapHeight;
    const scale = Math.min(scaleX, scaleY, 0.9); // Cap at 0.9 to ensure everything fits with margin

    // Calculate offset to center
    const offsetX = (canvasWidth - mindmapWidth * scale) / 2 - minX * scale;
    const offsetY = (canvasHeight - mindmapHeight * scale) / 2 - minY * scale;

    return { scale, offset: { x: offsetX, y: offsetY } };
  }, [data, nodePositions, draggedPositions, nodeWidths, canvasRef]);

  // Get final node position without any transformations
  const getNodePosition = (nodeId: string) => {
    return nodePositions[nodeId] || { x: 0, y: 0 };
  };

  // Handle canvas drag (for panning)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isCard = target.closest('.node-card');
      
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

  // Handle wheel zoom - delegate to parent if handler provided
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    
    if (onZoom) {
      onZoom(direction);
    } else {
      // If no parent handler, use local zoom state
      setLocalZoom(prev => {
        if (direction > 0) {
          return Math.min(prev + 0.05, 2);
        } else {
          const step = Math.max(0.05, prev * 0.1);
          return Math.max(0.1, prev - step);
        }
      });
    }
  }, [onZoom]);

  // Helper function to check if a node is a descendant of a hidden node
  const isNodeDescendantOfHidden = useCallback((nodeId: string): boolean => {
    if (!data) return false;
    
    let currentNode = data.nodes.find(n => n.id === nodeId);
    if (!currentNode) return false;
    
    // Use a new variable with a type assertion to avoid TypeScript errors
    let nodeToCheck: MindMapNode = currentNode;
    
    while (nodeToCheck.parentId) {
      const parent = data.nodes.find(n => n.id === nodeToCheck.parentId);
      if (!parent) break;
      
      // If any ancestor has hidden children, this node is hidden
      if (hiddenChildren[parent.id]) {
        return true;
      }
      
      nodeToCheck = parent;
    }
    
    return false;
  }, [data, hiddenChildren]);

  // Render connections between nodes
  const renderConnections = useCallback(() => {
    if (!data) return null;
    
    const connections: React.ReactNode[] = [];
    
    data.nodes.forEach((node) => {
      if (node.parentId) {
        const parent = data.nodes.find(n => n.id === node.parentId);
        if (!parent) return;
        
        // Check if either node is hidden due to collapsed parent
        const isNodeHidden = isNodeDescendantOfHidden(node.id);
        const isParentHidden = isNodeDescendantOfHidden(parent.id);
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
        
        const key = `${parent.id}-${node.id}`;
        
        connections.push(
          <Line 
            key={key}
            startPosition={parentPos}
            endPosition={nodePos}
            isParentExpanded={isParentExpanded}
            isChildExpanded={isNodeExpanded}
            isVisible={isLineVisible}
            isDragging={isCardBeingDragged.current}
            nodeWidth={parentWidth}
          />
        );
      }
    });
    
    return connections;
  }, [data, nodePositions, draggedPositions, nodeWidths, hiddenChildren, nodeExpanded, animatingNodes, showingAnimation, isNodeDescendantOfHidden]);

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
      canvasRef.current.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    }
  }, [zoom, initialRenderComplete]);

  useEffect(() => {
    // Update transitions whenever pan changes
    if (canvasRef.current && initialRenderComplete && !isDragging) {
      const innerContainer = canvasRef.current.querySelector('.absolute.inset-0');
      if (innerContainer) {
        // Apply smooth transition when pan changes
        (innerContainer as HTMLElement).style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      }
    }
  }, [pan, initialRenderComplete, isDragging]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-gray-100 flex items-center justify-center p-12 ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Canvas container */}
      <div 
        ref={canvasRef}
        className="relative bg-white shadow-lg rounded-lg"
        style={{
          width: '297mm', // A4 landscape width
          height: '210mm', // A4 landscape height
          maxWidth: 'calc(100vw - 6rem)',
          maxHeight: 'calc(100vh - 8rem)',
          transform: `scale(${effectiveZoom})`,
          transformOrigin: 'center center',
          transition: isDragging || !initialRenderComplete ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'visible' // Allow elements to extend beyond canvas boundaries
        }}
      >
        {/* Container for the mindmap with panning */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${effectivePan.x}px, ${effectivePan.y}px)`,
            transition: isDragging || !initialRenderComplete ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'visible' // Allow elements to extend beyond boundaries
          }}
        >
          {/* SVG for connections - Must be rendered AFTER position calculations but BEFORE nodes */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              overflow: 'visible',
              width: '100%',
              height: '100%',
              zIndex: 5, // Ensure lines appear behind nodes
              willChange: resizingNodeId ? 'transform' : 'auto'  // Force GPU acceleration during resize
            }}
            key={`svg-container-${resizingNodeId || 'default'}`} // Force re-render of SVG when resize changes
          >
            {renderConnections()}
          </svg>
          
          {/* Render nodes */}
          {data?.nodes
            .filter(node => {
              if (!node.parentId) return true;
              
              let currentNode = node;
              let isDescendantOfHiddenNode = false;
              
              while (currentNode.parentId) {
                const parent = data.nodes.find(n => n.id === currentNode.parentId);
                if (!parent) break;
                
                if (hiddenChildren[parent.id]) {
                  isDescendantOfHiddenNode = true;
                  break;
                }
                
                currentNode = parent;
              }
              
              return !isDescendantOfHiddenNode;
            })
            .map(node => {
              const position = getNodePosition(node.id);
              const isExpanded = nodeExpanded[node.id] || false;
              const areChildrenHidden = hiddenChildren[node.id] || false;
              const hasChildren = data.nodes.some(n => n.parentId === node.id);
              const isSelected = selectedNodes.includes(node.id);
              
              return (
                <NodeCard
                  key={node.id}
                  node={node}
                  basePosition={position}
                  draggedPosition={{x: 0, y: 0}}
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
                />
              );
            })}
        </div>
      </div>
      
      {/* Render children (zoom controls, etc.) */}
      {children}
    </div>
  );
} 