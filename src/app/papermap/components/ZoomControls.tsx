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
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle press and hold for continuous zooming with acceleration
  useEffect(() => {
    if (activeButton === null) {
      // Clear any existing intervals and timeouts when no button is active
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
        zoomIntervalRef.current = null;
      }
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = null;
      }
      return;
    }
    
    // Initial zoom action with a small delay for better control
    zoomTimeoutRef.current = setTimeout(() => {
      if (activeButton === 'in') {
        onZoomIn();
      } else {
        onZoomOut();
      }
    }, 50);
    
    // Start with a longer delay before continuous zoom
    const startContinuousTimeout = setTimeout(() => {
      let zoomSpeed = 200; // Initial interval between zooms
      let accelerationPhase = 0;
      
      // Set up an interval for continuous zooming while button is held
      const interval = setInterval(() => {
        if (activeButton === 'in') {
          onZoomIn();
        } else {
          onZoomOut();
        }
        
        // Gradually increase zoom speed
        accelerationPhase++;
        if (accelerationPhase > 5 && zoomSpeed > 50) {
          zoomSpeed = Math.max(50, zoomSpeed * 0.8);
          // Reset the interval with the new speed
          clearInterval(zoomIntervalRef.current!);
          zoomIntervalRef.current = setInterval(() => {
            if (activeButton === 'in') {
              onZoomIn();
            } else {
              onZoomOut();
            }
          }, zoomSpeed);
        }
      }, zoomSpeed);
      
      zoomIntervalRef.current = interval;
    }, 400);
    
    // Clean up all intervals and timeouts
    return () => {
      clearTimeout(startContinuousTimeout);
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
        zoomIntervalRef.current = null;
      }
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = null;
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
    if (fitActive) return;
    
    setFitActive(true);
    
    // Clean up any existing timeout
    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current);
    }
    
    // Small delay for visual feedback before zoom
    setTimeout(() => {
      onResetZoom();
    }, 50);
    
    // Reset the active state after animation
    fitTimeoutRef.current = setTimeout(() => {
      setFitActive(false);
    }, 800);
  };
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
      }
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
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
        className={`w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center transition-all duration-150 ${
          activeButton === 'in' ? 'bg-gray-300 transform scale-95' : ''
        }`}
        title="Zoom In"
      >
        <span className="text-sm font-bold select-none">+</span>
      </button>
      <button 
        onClick={handleFitClick}
        className={`w-6 h-6 ${
          fitActive 
            ? 'bg-blue-500 text-white shadow-md transform scale-95' 
            : 'bg-gray-200 hover:bg-gray-300'
        } rounded flex items-center justify-center transition-all duration-150`}
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
        className={`w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center transition-all duration-150 ${
          activeButton === 'out' ? 'bg-gray-300 transform scale-95' : ''
        }`}
        title="Zoom Out"
      >
        <span className="text-sm font-bold select-none">-</span>
      </button>
    </div>
  );
};

export default ZoomControls; 