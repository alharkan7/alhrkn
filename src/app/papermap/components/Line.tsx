import React, { useEffect, useState } from 'react';
import { NodePosition } from './MindMapTypes';

interface LineProps {
  startPosition: NodePosition;
  endPosition: NodePosition;
  isParentExpanded: boolean;
  isChildExpanded: boolean;
  parentToggleButtonRef?: HTMLDivElement;
  childToggleButtonRef?: HTMLDivElement;
  isVisible?: boolean; // Add visibility prop for animation
}

const Line: React.FC<LineProps> = ({ 
  startPosition, 
  endPosition,
  isParentExpanded,
  isChildExpanded,
  parentToggleButtonRef,
  childToggleButtonRef,
  isVisible = true // Default to visible
}) => {
  // Card dimensions
  const CARD_WIDTH = 300;
  
  // Connection points (from right of parent to left of child)
  const startX = startPosition.x + CARD_WIDTH; // Right side of parent card
  
  // Get the Y position based on whether the card is expanded
  const getToggleButtonY = (basePosition: NodePosition, isExpanded: boolean) => {
    if (isExpanded) {
      // When expanded, the toggle button is positioned at a fixed 24px from the top
      return basePosition.y + 32;
    } else {
      // When collapsed, the toggle button is at 50% of the card height (24px)
      return basePosition.y + 32;
    }
  };
  
  // Calculate positions based on expansion state
  const startY = getToggleButtonY(startPosition, isParentExpanded);
  const endX = endPosition.x; // Left side of child card
  const endY = getToggleButtonY(endPosition, isChildExpanded);
  
  // Create a smooth curve between the points
  const dx = endX - startX;
  const controlPointDistance = Math.abs(dx) * 0.4;
  const path = `M${startX},${startY} C${startX + controlPointDistance},${startY} ${endX - controlPointDistance},${endY} ${endX},${endY}`;
  
  // Generate a unique ID for this line's marker
  const markerId = `marker-${startX}-${startY}-${endX}-${endY}`;
  
  // Animation shift values based on animation direction
  // When disappearing, move to the right; when appearing, come from the left
  const animationOffsetX = 30; // Horizontal shift amount
  
  // Create a path for the animated entry/exit
  const animatedPath = isVisible
    ? path // Original path when visible
    : `M${startX + animationOffsetX/2},${startY} C${startX + controlPointDistance + animationOffsetX},${startY} ${endX - controlPointDistance + animationOffsetX},${endY} ${endX + animationOffsetX},${endY}`; // Shifted path for animation
  
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
            className="transition-opacity duration-250 ease-out" 
            style={{ opacity: isVisible ? 1 : 0 }} 
          />
        </marker>
      </defs>
      <path
        d={animatedPath}
        className="transition-all duration-250 ease-out"
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

export default Line; 