import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { MindMapNode, NodePosition } from './MindMapTypes';

interface NodeCardProps {
  node: MindMapNode;
  basePosition: NodePosition;
  draggedPosition: NodePosition;
  isExpanded: boolean;
  onDrag: (nodeId: string, e: any, data: { x: number, y: number }) => void;
  onToggleExpand: (nodeId: string) => void;
  onDragStop?: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  basePosition,
  draggedPosition,
  isExpanded,
  onDrag,
  onToggleExpand,
  onDragStop
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchMoveCountRef = useRef<number>(0);

  // Handle mouse down to detect potential drag start
  const handleMouseDown = () => {
    // Set a timeout to distinguish between click and drag
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(true);
    }, 150); // Short delay to detect if it's a drag or click
  };

  // Handle mouse up to detect click vs drag
  const handleMouseUp = () => {
    // Clear the timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // If we weren't dragging, it was a click - toggle expand
    if (!isDragging) {
      onToggleExpand(node.id);
    }
    
    // Reset dragging state
    setIsDragging(false);
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    // Clear the timeout if it exists
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  // Touch event handlers
  const handleTouchStart = () => {
    touchStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
  };

  const handleTouchMove = () => {
    touchMoveCountRef.current += 1;
    if (touchMoveCountRef.current > 3) {
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    const touchDuration = Date.now() - touchStartTimeRef.current;
    
    // If it was a short touch with minimal movement, treat as a click
    if (touchDuration < 300 && touchMoveCountRef.current < 3 && !isDragging) {
      onToggleExpand(node.id);
    }
    
    setIsDragging(false);
    touchMoveCountRef.current = 0;
  };

  return (
    <Draggable
      nodeRef={nodeRef as any}
      position={draggedPosition}
      onDrag={(e, data) => onDrag(node.id, e, data)}
      onStop={() => {
        if (onDragStop) onDragStop();
        setIsDragging(false);
      }}
      onStart={handleDragStart}
      cancel=".no-drag" // Elements with this class won't trigger dragging
    >
      <div
        ref={nodeRef}
        className="node-card"
        style={{
          position: 'absolute',
          left: `${basePosition.x}px`,
          top: `${basePosition.y}px`,
          width: '300px',
          zIndex: 10,
          touchAction: 'none', // Important for touch devices
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 relative"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{node.title}</h3>
            <button 
              className="text-gray-500 hover:text-gray-700 no-drag" 
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
            >
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
    </Draggable>
  );
};

export default NodeCard; 