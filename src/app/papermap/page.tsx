'use client';

import React, { useState, useEffect, useRef, useCallback, TouchEvent } from 'react';
import NodeCard from './components/NodeCard';
import Uploader from './components/Uploader';
import Line from './components/Line';
import { MindMapData, COLUMN_WIDTH, NODE_VERTICAL_SPACING, sampleData } from './components/MindMapTypes';
import { NodePosition } from './components/NodeCard';

export default function PaperMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeExpanded, setNodeExpanded] = useState<Record<string, boolean>>({});
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggedPositions, setDraggedPositions] = useState<Record<string, NodePosition>>({});
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isTouchDragging = useRef(false);
  const isCardBeingDragged = useRef(false);

  // Calculate initial positions
  useEffect(() => {
    if (data) {
      const initialPositions: Record<string, NodePosition> = {};
      
      // Group nodes by level
      const nodesByLevel = data.nodes.reduce((acc, node) => {
        acc[node.level] = acc[node.level] || [];
        acc[node.level].push(node);
        return acc;
      }, {} as Record<number, typeof data.nodes>);
      
      // Calculate positions for each node
      data.nodes.forEach(node => {
        const levelNodes = nodesByLevel[node.level];
        const nodeIndex = levelNodes.indexOf(node);
        initialPositions[node.id] = {
          x: node.level * COLUMN_WIDTH,
          y: nodeIndex * NODE_VERTICAL_SPACING + 50
        };
      });
      
      setNodePositions(initialPositions);
    }
  }, [data]);

  // Load sample data initially
  useEffect(() => {
    setData(sampleData);
  }, []);

  // Center view when data or container changes
  useEffect(() => {
    if (data && containerRef.current) {
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
        
        // Calculate center position
        const mindmapWidth = maxX - minX;
        const mindmapHeight = maxY - minY;
        
        // Calculate the pan needed to center
        const newPanX = (containerWidth - mindmapWidth) / 2 - minX;
        const newPanY = (containerHeight - mindmapHeight) / 2 - minY;
        
        // Apply centering
        setPan({ x: newPanX, y: newPanY });
      }, 100);
    }
  }, [data, nodePositions, containerRef]);

  // Toggle node expansion
  const toggleNode = (id: string) => {
    setNodeExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    // Reset any custom pan or dragged positions to re-center
    if (containerRef.current && data) {
      // Recenter (calling useEffect's logic again)
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Recalculate mindmap bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      
      Object.values(nodePositions).forEach(pos => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x + 300);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y + 100);
      });
      
      const mindmapWidth = maxX - minX;
      const mindmapHeight = maxY - minY;
      
      const newPanX = (containerWidth - mindmapWidth) / 2 - minX;
      const newPanY = (containerHeight - mindmapHeight) / 2 - minY;
      
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Handle canvas drag (for panning)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if it's a left-click directly on the container
    // and not on any of its children (like the nodes)
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const container = containerRef.current;
      
      // Check if the click is directly on the container or the canvas
      // and not on a node or other element
      if (container && (target === container || target === canvasRef.current)) {
        setIsDragging(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !isCardBeingDragged.current) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: TouchEvent) => {
    // Check if the touch is directly on the container or canvas
    // and not on a node
    const target = e.target as HTMLElement;
    const container = containerRef.current;
    
    if (container && (target === container || target === canvasRef.current)) {
      isTouchDragging.current = true;
      
      // Get the first touch point
      const touch = e.touches[0];
      setStartPan({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isTouchDragging.current && !isCardBeingDragged.current) {
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
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
    setZoom(newZoom);
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <Uploader 
          onFileUpload={handleFileUpload}
          loading={loading}
          error={error}
        />
        
        {/* Zoom controls */}
        <div className="flex space-x-2">
          <button 
            onClick={handleZoomOut}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-lg font-bold"
            title="Zoom Out"
          >
            -
          </button>
          <button 
            onClick={handleResetZoom}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            title="Reset View"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button 
            onClick={handleZoomIn}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-lg font-bold"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 bg-gray-50 relative overflow-hidden"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
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
              zIndex: 1,
              pointerEvents: 'none', // Allows clicking through to the containers
            }}
          >
            {/* Create connections */}
            {data?.nodes
              .filter(node => node.parentId)
              .map(node => {
                const parent = data.nodes.find(n => n.id === node.parentId);
                if (!parent) return null;
                
                const parentPos = getNodePosition(parent.id);
                const nodePos = getNodePosition(node.id);
                
                return (
                  <Line
                    key={`${parent.id}-${node.id}`}
                    startPosition={parentPos}
                    endPosition={nodePos}
                  />
                );
              })}
          </svg>
          
          {/* Render nodes */}
          {data?.nodes.map(node => {
            const basePosition = nodePositions[node.id] || { x: 0, y: 0 };
            const draggedPosition = draggedPositions[node.id] || { x: 0, y: 0 };
            const isExpanded = nodeExpanded[node.id] || false;
            
            return (
              <NodeCard
                key={node.id}
                node={node}
                basePosition={basePosition}
                draggedPosition={draggedPosition}
                isExpanded={isExpanded}
                onDrag={handleDrag}
                onToggleExpand={toggleNode}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

