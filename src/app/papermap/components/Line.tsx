import React, { useEffect, useState } from 'react';
import { NodePosition } from './MindMapTypes';

interface LineProps {
  startPosition: NodePosition;
  endPosition: NodePosition;
  isParentExpanded: boolean;
  isChildExpanded: boolean;
  parentToggleButtonRef?: HTMLDivElement;
  childToggleButtonRef?: HTMLDivElement;
}

const Line: React.FC<LineProps> = ({ 
  startPosition, 
  endPosition,
  isParentExpanded,
  isChildExpanded,
  parentToggleButtonRef,
  childToggleButtonRef
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
          strokeWidth: 2,
          fill: 'none',
          pointerEvents: 'none',
        }}
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
};

export default Line; 