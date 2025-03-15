import React from 'react';
import { NodePosition } from './NodeCard';

interface LineProps {
  startPosition: NodePosition;
  endPosition: NodePosition;
  nodeWidth?: number;
  nodeHeight?: number;
  color?: string;
  strokeWidth?: number;
}

const Line: React.FC<LineProps> = ({
  startPosition,
  endPosition,
  nodeWidth = 300,
  nodeHeight = 80,
  color = '#6366f1',
  strokeWidth = 3
}) => {
  // Calculate connection points (from right of parent to left of child)
  const startX = startPosition.x + nodeWidth; // Right side of parent card
  const startY = startPosition.y + (nodeHeight / 2); // Middle of card height
  const endX = endPosition.x; // Left side of child card
  const endY = endPosition.y + (nodeHeight / 2); // Middle of card height
  
  // Curved path
  const path = `M${startX},${startY} C${(startX + endX) / 2},${startY} ${(startX + endX) / 2},${endY} ${endX},${endY}`;
  
  return (
    <path
      d={path}
      style={{
        stroke: color,
        strokeWidth: strokeWidth,
        fill: 'none',
      }}
    />
  );
};

export default Line; 