import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MindMapNode } from './MindMapTypes';
import { XIcon } from './Icons';

interface FollowUpCardProps {
  parentNode: MindMapNode;
  onSave: (parentId: string, question: string) => void;
  onCancel: () => void;
}

const FollowUpCard: React.FC<FollowUpCardProps> = ({
  parentNode,
  onSave,
  onCancel
}) => {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Create a portal container when the component mounts
  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof document !== 'undefined') {
      // Check if portal container already exists
      let container = document.getElementById('follow-up-portal');
      
      // If not, create it
      if (!container) {
        container = document.createElement('div');
        container.id = 'follow-up-portal';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '9999999'; // Very high z-index
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }
      
      setPortalContainer(container);
      
      // Clean up the portal container when component unmounts
      return () => {
        // Only remove the container if it's empty
        if (container && container.childNodes.length === 0) {
          document.body.removeChild(container);
        }
      };
    }
  }, []);
  
  // Set focus on input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && question.trim()) {
      e.preventDefault();
      onSave(parentNode.id, question);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };
  
  const handleSave = () => {
    if (question.trim()) {
      onSave(parentNode.id, question);
    }
  };
  
  // Content to be rendered in the portal
  const content = (
    <div 
      className="follow-up-overlay" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.05)', // Semi-transparent overlay
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.1s ease-out forwards'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div 
        ref={cardRef}
        className="follow-up-card" 
        style={{ 
          width: '360px',
          pointerEvents: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          position: 'relative',
          animation: 'scaleIn 0.2s ease-out forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes scaleIn {
            from { 
              transform: scale(0.95);
              opacity: 0;
            }
            to { 
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
        <div className="p-3 font-medium text-sm text-blue-600 flex justify-between border-b border-gray-100 bg-gray-50">
          <span>Ask a Question</span>
          <button 
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your question here..."
            value={question}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus={true}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button 
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                setQuestion("Give an example");
                onSave(parentNode.id, "Give an example");
              }}
            >
              Give an example
            </button>
            <button 
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                setQuestion("Add more details");
                onSave(parentNode.id, "Add more details");
              }}
            >
              Add more details
            </button>
          </div>
          <div className="flex justify-end mt-4 space-x-2 text-sm">
            <button 
              className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!question.trim()}
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Only render the portal if the container is available
  if (!portalContainer) {
    return null;
  }
  
  // Use createPortal to render the component directly into the portal container
  return createPortal(content, portalContainer);
};

export default FollowUpCard;