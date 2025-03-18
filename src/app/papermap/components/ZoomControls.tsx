import React, { useState, useEffect, useRef } from 'react';
import { FitToViewIcon } from './Icons';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  onZoomIn, 
  onZoomOut, 
  onResetZoom 
}) => {
  const [activeButton, setActiveButton] = useState<'in' | 'out' | null>(null);
  const [fitActive, setFitActive] = useState(false);
  const zoomIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle press and hold for continuous zooming
  useEffect(() => {
    if (activeButton === null) {
      // Clear any existing interval when no button is active
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
        zoomIntervalRef.current = null;
      }
      return;
    }
    
    // Initial zoom action
    if (activeButton === 'in') {
      onZoomIn();
    } else {
      onZoomOut();
    }
    
    // Small delay before starting continuous zoom for better control
    const timeoutId = setTimeout(() => {
      // Set up an interval for continuous zooming while button is held
      const interval = setInterval(() => {
        if (activeButton === 'in') {
          onZoomIn();
        } else {
          onZoomOut();
        }
      }, 80); // Slightly faster for smoother continuous zooming
      
      zoomIntervalRef.current = interval;
    }, 300); // Delay before continuous zoom kicks in
    
    // Clean up the interval and timeout when component unmounts or button state changes
    return () => {
      clearTimeout(timeoutId);
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
        zoomIntervalRef.current = null;
      }
    };
  }, [activeButton, onZoomIn, onZoomOut]);
  
  // Handle mouse/touch events for press and hold
  const handleZoomButtonDown = (direction: 'in' | 'out') => {
    setActiveButton(direction);
  };
  
  const handleZoomButtonUp = () => {
    setActiveButton(null);
  };
  
  const handleFitClick = () => {
    // Visual feedback for fit button
    setFitActive(true);
    onResetZoom();
    
    // Reset the active state after animation completes
    setTimeout(() => {
      setFitActive(false);
    }, 600); // Match the animation duration in page.tsx
  };
  
  return (
    <div className="absolute bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-2 flex flex-col space-y-1.5 bg-white bg-opacity-90 p-1.5 rounded-lg shadow-md z-50">
      <button 
        onMouseDown={() => handleZoomButtonDown('in')}
        onMouseUp={handleZoomButtonUp}
        onMouseLeave={handleZoomButtonUp}
        onTouchStart={() => handleZoomButtonDown('in')}
        onTouchEnd={handleZoomButtonUp}
        className={`w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center transition-colors ${activeButton === 'in' ? 'bg-gray-300' : ''}`}
        title="Zoom In"
      >
        <span className="text-sm font-bold">+</span>
      </button>
      <button 
        onClick={handleFitClick}
        className={`w-6 h-6 ${fitActive ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded hover:bg-gray-300 flex items-center justify-center transition-all duration-200`}
        title="Fit to View"
      >
        <FitToViewIcon className={`w-4 h-4 ${fitActive ? 'text-white' : ''}`} />
      </button>
      <button 
        onMouseDown={() => handleZoomButtonDown('out')}
        onMouseUp={handleZoomButtonUp}
        onMouseLeave={handleZoomButtonUp}
        onTouchStart={() => handleZoomButtonDown('out')}
        onTouchEnd={handleZoomButtonUp}
        className={`w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center transition-colors ${activeButton === 'out' ? 'bg-gray-300' : ''}`}
        title="Zoom Out"
      >
        <span className="text-sm font-bold">-</span>
      </button>
    </div>
  );
};

export default ZoomControls; 