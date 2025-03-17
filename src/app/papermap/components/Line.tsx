import React from 'react';
import { NodePosition } from './MindMapTypes';

interface LineProps {
  startPosition: NodePosition;
  endPosition: NodePosition;
}

const Line: React.FC<LineProps> = ({ startPosition, endPosition }) => {
  // Fixed height for the toggle button position (matches the card header height)
  const TOGGLE_BUTTON_OFFSET = 32; // This is the vertical position of the toggle button from the top of the card
  
  // Connection points (from right of parent to left of child)
  const startX = startPosition.x + 300; // 300px is card width
  const startY = startPosition.y + TOGGLE_BUTTON_OFFSET; // Fixed position aligned with the toggle button
  const endX = endPosition.x;
  const endY = endPosition.y + TOGGLE_BUTTON_OFFSET; // Same fixed position on child node
  
  // Curved path with no constraints
  const path = `M${startX},${startY} C${(startX + endX) / 2},${startY} ${(startX + endX) / 2},${endY} ${endX},${endY}`;
  
  // Generate a unique ID for this line's marker
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
          <circle cx="5" cy="5" r="4" fill="#6366f1" />
        </marker>
      </defs>
      <path
        d={path}
        style={{
          stroke: '#6366f1',
          strokeWidth: 3,
          fill: 'none',
          pointerEvents: 'none', // Ensure it doesn't interfere with interactions
        }}
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
};

export default Line; 