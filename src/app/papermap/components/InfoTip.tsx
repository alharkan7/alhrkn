import React from 'react';

interface InfoTipProps {
  visible: boolean;
  onClose: () => void;
  message?: string; // Make it optional to maintain backward compatibility
}

const InfoTip: React.FC<InfoTipProps> = ({ onClose, visible, message }) => {
  if (!visible) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-600 flex items-center space-x-2 z-50 animate-fadeIn">
      <span>{message || "Hold Shift key and drag to select multiple nodes"}</span>
      <button 
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-gray-600"
      >
        ×
      </button>
    </div>
  );
};

export default InfoTip;
export type { InfoTipProps };