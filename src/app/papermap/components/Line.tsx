import React from 'react';
import { NodePosition } from './MindMapTypes';

interface LineProps {
  startPosition: NodePosition;
  endPosition: NodePosition;
  isParentExpanded: boolean;
  isChildExpanded: boolean;
  isVisible?: boolean;
  isDragging?: boolean;
  nodeWidth: number;
}

const Line: React.FC<LineProps> = ({ 
  startPosition, 
  endPosition,
  isVisible = true,
  isDragging = false,
  nodeWidth
}) => {
  // Calculate positions directly
  const startX = startPosition.x + nodeWidth;
  const startY = startPosition.y + 32;
  const endX = endPosition.x;
  const endY = endPosition.y + 32;
  
  const dx = endX - startX;
  const controlPointDistance = Math.abs(dx) * 0.4;
  
  const path = `M${startX},${startY} C${startX + controlPointDistance},${startY} ${endX - controlPointDistance},${endY} ${endX},${endY}`;
  const markerId = `marker-${startX}-${startY}-${endX}-${endY}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <circle 
            cx="5" 
            cy="5" 
            r="4" 
            fill="#6366f1" 
            className={isDragging ? "" : "transition-opacity duration-250 ease-out"} 
            style={{ opacity: isVisible ? 1 : 0 }} 
          />
        </marker>
      </defs>
      <path
        d={path}
        className={isDragging ? "" : "transition-all duration-250 ease-out"}
        style={{
          stroke: '#6366f1',
          strokeWidth: 2,
          fill: 'none',
          pointerEvents: 'none',
          opacity: isVisible ? 1 : 0,
        }}
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
};

export default React.memo(Line);