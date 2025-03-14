'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';

// Define proper interface for DraggableWrapper props
interface DraggableWrapperProps {
  children: React.ReactNode;
  position: { x: number; y: number };
  onDrag: (e: any, data: { x: number; y: number }) => void;
  bounds: object;
  key?: string | number;
}

// Custom wrapper for Draggable component to avoid findDOMNode errors
const DraggableWrapper = ({ children, position, onDrag, bounds, ...rest }: DraggableWrapperProps) => {
  // Use a ref to a HTMLDivElement
  const nodeRef = useRef<HTMLDivElement>(null);
  
  return (
    <Draggable 
      // Cast the ref as any to bypass the type checking
      nodeRef={nodeRef as any}
      position={position} 
      onDrag={onDrag} 
      bounds={bounds}
      {...rest}
    >
      <div ref={nodeRef}>
        {children}
      </div>
    </Draggable>
  );
};

interface MindMapNode {
  id: string;
  title: string;
  description: string;
  parentId: string | null;
  level: number;
}

interface MindMapData {
  nodes: MindMapNode[];
}

interface NodePosition {
  x: number;
  y: number;
}

// Node positions for connections
const COLUMN_WIDTH = 400;
const NODE_VERTICAL_SPACING = 200;

// Sample data for testing
const sampleData: MindMapData = {
  nodes: [
    { id: 'node1', title: 'Paper Title', description: 'This is the main topic of the research paper.', parentId: null, level: 0 },
    { id: 'node2', title: 'Introduction', description: 'Provides background and context for the research.', parentId: 'node1', level: 1 },
    { id: 'node3', title: 'Methods', description: 'Details the approach used in the research.', parentId: 'node1', level: 1 },
    { id: 'node4', title: 'Results', description: 'Presents the findings of the research.', parentId: 'node1', level: 1 },
    { id: 'node5', title: 'Key Finding 1', description: 'The first major discovery from the research.', parentId: 'node4', level: 2 },
  ]
};

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

  // Calculate initial positions
  useEffect(() => {
    if (data) {
      const initialPositions: Record<string, NodePosition> = {};
      
      // Group nodes by level
      const nodesByLevel = data.nodes.reduce((acc, node) => {
        acc[node.level] = acc[node.level] || [];
        acc[node.level].push(node);
        return acc;
      }, {} as Record<number, MindMapNode[]>);
      
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
    setDraggedPositions(prev => ({
      ...prev,
      [nodeId]: { x: data.x, y: data.y }
    }));
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
    if (e.button === 0) { // Left button only
      setIsDragging(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
        <div className="flex-1">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {loading && <p className="mt-2 text-blue-600">Analyzing paper...</p>}
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </div>
        
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
        className="flex-1 bg-gray-50 relative overflow-hidden cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div 
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
                
                // Connection points (from right of parent to left of child)
                const startX = parentPos.x + 300; // 300px is card width
                const startY = parentPos.y + 40; // Middle of card height
                const endX = nodePos.x;
                const endY = nodePos.y + 40;
                
                // Curved path
                const path = `M${startX},${startY} C${(startX + endX) / 2},${startY} ${(startX + endX) / 2},${endY} ${endX},${endY}`;
                
                return (
                  <path
                    key={`${parent.id}-${node.id}`}
                    d={path}
                    style={{
                      stroke: '#6366f1',
                      strokeWidth: 3,
                      fill: 'none',
                    }}
                  />
                );
              })}
          </svg>
          
          {/* Render nodes */}
          {data?.nodes.map(node => {
            const { x, y } = nodePositions[node.id] || { x: 0, y: 0 };
            const isExpanded = nodeExpanded[node.id] || false;
            
            return (
              <DraggableWrapper
                key={node.id}
                position={draggedPositions[node.id] || { x: 0, y: 0 }}
                onDrag={(e: any, data: { x: number, y: number }) => handleDrag(node.id, e, data)}
                bounds={{ top: -1000, left: -1000, right: 1000, bottom: 1000 }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: '300px',
                    zIndex: 10,
                    cursor: 'move',
                  }}
                >
                  <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <div 
                      className="flex justify-between items-center cursor-pointer" 
                      onClick={() => toggleNode(node.id)}
                    >
                      <h3 className="font-bold text-lg">{node.title}</h3>
                      <button className="text-gray-500 hover:text-gray-700">
                        {isExpanded ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <p className="text-sm text-gray-600 mt-2 border-t pt-2">{node.description}</p>
                    )}
                  </div>
                </div>
              </DraggableWrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
}

