import React from 'react';

interface InfoTipProps {
  onClose: () => void;
  visible: boolean;
}

const InfoTip: React.FC<InfoTipProps> = ({ onClose, visible }) => {
  if (!visible) return null;
  
  return (
    <div className="absolute top-16 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-md text-sm text-gray-700 max-w-xs z-50 animate-fadeIn">
      <h3 className="font-bold text-base mb-1">Card Interactions:</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Click a card to select it</li>
        <li>Double-click a card to expand/collapse it</li>
        <li>Drag and drop to reposition cards</li>
      </ul>
      
      <h3 className="font-bold text-base mt-3 mb-1">Multi-select:</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Click-drag on empty space to select multiple cards</li>
        <li>Hold <span className="font-mono bg-gray-100 px-1 rounded">Shift</span> + click-drag to pan the view</li>
        <li>Press <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+A</span> to select all visible cards</li>
        <li>Press <span className="font-mono bg-gray-100 px-1 rounded">Esc</span> to clear selection</li>
        <li>Drag any selected card to move all selected cards together</li>
      </ul>
      
      <button 
        onClick={onClose}
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
        aria-label="Close tip"
      >
        ×
      </button>
    </div>
  );
};

export default InfoTip; 