import React, { useRef, MouseEvent, TouchEvent, useState } from 'react';
import Draggable from 'react-draggable';

// Define interface for MindMapNode
export interface MindMapNode {
  id: string;
  title: string;
  description: string;
  parentId: string | null;
  level: number;
}

// Interface for node position
export interface NodePosition {
  x: number;
  y: number;
}

// Define proper interface for DraggableWrapper props
interface DraggableWrapperProps {
  children: React.ReactNode;
  position: NodePosition;
  onDrag: (e: any, data: { x: number; y: number }) => void;
  onStart: (e: any, data: any) => void | false;
  onStop: (e: any, data: any) => void;
  bounds: object;
  key?: string | number;
  defaultClassName?: string;
  defaultClassNameDragging?: string;
  cancel?: string;
  handle?: string;
}

// Custom wrapper for Draggable component to avoid findDOMNode errors
const DraggableWrapper = ({ 
  children, 
  position, 
  onDrag, 
  onStart, 
  onStop, 
  bounds, 
  defaultClassName,
  defaultClassNameDragging,
  cancel,
  handle,
  ...rest 
}: DraggableWrapperProps) => {
  // Use a ref to a HTMLDivElement
  const nodeRef = useRef<HTMLDivElement>(null);
  
  return (
    <Draggable 
      nodeRef={nodeRef as any}
      position={position} 
      onDrag={onDrag}
      onStart={onStart}
      onStop={onStop}
      bounds={bounds}
      defaultClassName={defaultClassName}
      defaultClassNameDragging={defaultClassNameDragging}
      // Important: These settings help with dragging behavior
      defaultPosition={{x: 0, y: 0}}
      scale={1}
      cancel={cancel}
      handle={handle}
      {...rest}
    >
      <div ref={nodeRef}>
        {children}
      </div>
    </Draggable>
  );
};

interface NodeCardProps {
  node: MindMapNode;
  basePosition: NodePosition;
  draggedPosition: NodePosition;
  isExpanded: boolean;
  onDrag: (nodeId: string, e: any, data: { x: number; y: number }) => void;
  onToggleExpand: (nodeId: string) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  basePosition,
  draggedPosition,
  isExpanded,
  onDrag,
  onToggleExpand
}) => {
  const { x, y } = basePosition;
  const isDragging = useRef(false);
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const [dragHandleClass] = useState('drag-handle');
  
  // Handle drag start
  const handleStart = (e: any, data: any): void => {
    isDragging.current = true;
    // We still want to stop propagation, but we need to make sure the drag works
    e.stopPropagation();
  };
  
  // Handle drag
  const handleDrag = (e: any, data: { x: number, y: number }) => {
    // Stop propagation to prevent the canvas drag from being triggered
    e.stopPropagation();
    onDrag(node.id, e, data);
  };
  
  // Handle drag stop
  const handleStop = (e: any, data: any) => {
    setTimeout(() => {
      isDragging.current = false;
    }, 10); // Small delay to prevent toggle from firing immediately after drag
    e.stopPropagation();
  };
  
  // Handle click on the header to toggle expansion
  const handleToggle = (e: MouseEvent) => {
    // Only toggle if we're not dragging
    if (!isDragging.current) {
      onToggleExpand(node.id);
    }
    e.stopPropagation();
  };
  
  // Handle touch start for mobile
  const handleTouchStart = (e: TouchEvent) => {
    touchStartTime.current = Date.now();
    if (e.touches.length > 0) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };
  
  // Handle touch end for mobile
  const handleTouchEnd = (e: TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime.current;
    
    // If touch was short and didn't move much, consider it a tap
    if (touchDuration < 300 && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If the touch didn't move much, consider it a tap
      if (distance < 10) {
        onToggleExpand(node.id);
        e.stopPropagation();
        e.preventDefault();
      }
    }
  };
  
  return (
    <DraggableWrapper
      key={node.id}
      position={draggedPosition}
      onDrag={handleDrag}
      onStart={handleStart}
      onStop={handleStop}
      bounds={{ top: -1000, left: -1000, right: 1000, bottom: 1000 }}
      defaultClassName="react-draggable"
      defaultClassNameDragging="react-draggable-dragging"
      cancel=".no-drag" // Elements with this class won't trigger dragging
      handle=".drag-handle" // Only elements with this class can start dragging
    >
      <div
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: '300px',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          // Only stop propagation, don't prevent default
          e.stopPropagation();
        }}
        className={dragHandleClass}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 drag-handle"
          style={{ cursor: 'grab' }}
        >
          <div 
            className="flex justify-between items-center no-drag" 
            onClick={handleToggle}
            style={{ cursor: 'pointer' }}
          >
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
            <p className="text-sm text-gray-600 mt-2 border-t pt-2 no-drag">{node.description}</p>
          )}
        </div>
      </div>
    </DraggableWrapper>
  );
};

export default NodeCard; 