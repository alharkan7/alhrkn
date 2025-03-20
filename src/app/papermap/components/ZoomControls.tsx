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
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
      }, 150); // Slightly slower for better control and smoother animation
      
      zoomIntervalRef.current = interval;
    }, 400); // Longer delay before continuous zoom kicks in
    
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
    // Avoid multiple rapid clicks
    if (fitActive) return;
    
    // Visual feedback for fit button
    setFitActive(true);
    
    // Need to ensure we clean up previous timeouts
    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current);
    }
    
    // Add a small delay before triggering the zoom reset
    // This gives the DOM time to update visual state
    setTimeout(() => {
      console.log("Fit button: Calling onResetZoom");
      // Trigger the reset zoom handler (fit to view)
      onResetZoom();
    }, 50);
    
    // Reset the active state after animation completes
    // Use a longer timeout to ensure the animation completes
    const timeoutId = setTimeout(() => {
      setFitActive(false);
    }, 1200); // Longer duration to ensure animation completes
    
    fitTimeoutRef.current = timeoutId;
  };
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="absolute bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-2 flex flex-col space-y-1.5 bg-white bg-opacity-90 p-1.5 rounded-lg shadow-md z-50">
      <button 
        onMouseDown={() => handleZoomButtonDown('in')}
        onMouseUp={handleZoomButtonUp}
        onMouseLeave={handleZoomButtonUp}
        onTouchStart={() => handleZoomButtonDown('in')}
        onTouchEnd={handleZoomButtonUp}
        onTouchCancel={handleZoomButtonUp}
        className={`w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center transition-colors ${activeButton === 'in' ? 'bg-gray-300' : ''}`}
        title="Zoom In"
      >
        <span className="text-sm font-bold">+</span>
      </button>
      <button 
        onClick={handleFitClick}
        className={`w-6 h-6 ${
          fitActive 
            ? 'bg-blue-500 text-white shadow-md transform scale-110' 
            : 'bg-gray-200 hover:bg-gray-300'
        } rounded flex items-center justify-center transition-all duration-300`}
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
        onTouchCancel={handleZoomButtonUp}
        className={`w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center transition-colors ${activeButton === 'out' ? 'bg-gray-300' : ''}`}
        title="Zoom Out"
      >
        <span className="text-sm font-bold">-</span>
      </button>
    </div>
  );
};

export default ZoomControls; 