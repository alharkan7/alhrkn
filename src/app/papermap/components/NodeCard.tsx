import React, { useRef } from 'react';
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

  return (
    <Draggable
      nodeRef={nodeRef as any}
      position={draggedPosition}
      onDrag={(e, data) => onDrag(node.id, e, data)}
      onStop={onDragStop}
      bounds="parent"
      handle=".drag-handle" // Only the element with this class will trigger dragging
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
        }}
      >
        <div 
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 relative"
          onClick={() => onToggleExpand(node.id)} // Entire card toggles expansion
        >
          {/* Drag handle indicator */}
          <div 
            className="drag-handle absolute top-0 right-0 w-6 h-6 flex items-center justify-center bg-gray-100 rounded-bl-lg rounded-tr-lg cursor-move border-l border-b border-gray-200 hover:bg-gray-200"
            onClick={(e) => e.stopPropagation()} // Prevent toggle when clicking the handle
            title="Drag to move"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>

          <div className="flex items-center gap-2"> {/* Changed to use gap instead of justify-between */}
            <h3 className="font-bold text-lg">{node.title}</h3>
            <button className="text-gray-500 hover:text-gray-700"> {/* Added ml-2 for a bit of spacing */}
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