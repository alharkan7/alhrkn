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
  // Add a debug useEffect
  React.useEffect(() => {
    // We intentionally log width changes to help with debugging
    // console.log('Line rerendered with width:', nodeWidth);
  }, [nodeWidth]);
  
  // Calculate positions for the curved line
  
  // Start EXACTLY at right edge of the parent node's card
  const startX = startPosition.x + nodeWidth;
  
  // The title div has a fixed height of 50px, so vertical center is at 25px
  const startY = startPosition.y + 25;
  
  // End EXACTLY at left edge of the child node's card
  const endX = endPosition.x;
  
  // Use same vertical position (center of title div)
  const endY = endPosition.y + 25;
  
  // Calculate control points for the curve
  const dx = endX - startX;
  const dy = endY - startY;
  
  // Adjust the control point distance based on the horizontal distance
  // Shorter curve for better following during dragging
  const controlPointDistance = Math.min(Math.abs(dx) * 0.4, 80);
  
  // Create a truly unique marker ID that's safe for SVG
  // Use a combination of position values with different multipliers to avoid collisions
  const uniqueId = Math.floor(
    Math.abs((startX * 17.31) + (startY * 23.17) + (endX * 31.73) + (endY * 37.61))
  ).toString(36);
  
  const safeMarkerId = `marker-${uniqueId}`;

  // Generate the SVG path for a curved line
  const path = `M${startX},${startY} C${startX + controlPointDistance},${startY} ${endX - controlPointDistance},${endY} ${endX},${endY}`;

  return (
    <>
      <defs>
        <marker
          id={safeMarkerId}
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
            style={{ 
              opacity: isVisible ? 1 : 0,
              transition: 'none !important', // Use important to override any CSS
              animation: 'none !important'
            }} 
          />
        </marker>
      </defs>
      <path
        d={path}
        style={{
          stroke: '#6366f1',
          strokeWidth: 2,
          fill: 'none',
          pointerEvents: 'none',
          opacity: isVisible ? 1 : 0,
          transition: 'none !important', // Use important to override any CSS
          animation: 'none !important',
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
          willChange: 'd, points, path' // Optimize specifically for path changes
        }}
        markerEnd={`url(#${safeMarkerId})`}
      />
    </>
  );
};

// Export without memo to ensure it always rerenders
export default Line;