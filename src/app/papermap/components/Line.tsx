import React from 'react';
import { NodePosition } from './MindMapTypes';

interface LineProps {
  startPosition: NodePosition;
  endPosition: NodePosition;
}

const Line: React.FC<LineProps> = ({ startPosition, endPosition }) => {
  // Connection points (from right of parent to left of child)
  const startX = startPosition.x + 300; // 300px is card width
  const startY = startPosition.y + 40; // Middle of card height
  const endX = endPosition.x;
  const endY = endPosition.y + 40;
  
  // Curved path
  const path = `M${startX},${startY} C${(startX + endX) / 2},${startY} ${(startX + endX) / 2},${endY} ${endX},${endY}`;
  
  return (
    <path
      d={path}
      style={{
        stroke: '#6366f1',
        strokeWidth: 3,
        fill: 'none',
      }}
    />
  );
};

export default Line; 