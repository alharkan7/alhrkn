import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MindMapNode } from '../types';
import { X, LoaderCircle } from 'lucide-react';
import { followUpCardStyles } from '../styles/styles';

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
  const [isProcessing, setIsProcessing] = useState(false);
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
    if (e.key === 'Enter' && question.trim() && !isProcessing) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };
  
  const handleSave = () => {
    if (question.trim() && !isProcessing) {
      setIsProcessing(true);
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
        if (!isProcessing) {
          onCancel();
        }
      }}
    >
      <div 
        ref={cardRef}
        className="follow-up-card" 
        style={{ 
          width: '360px',
          pointerEvents: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          backgroundColor: 'var(--card)',
          background: 'hsl(var(--card) / 1)',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          position: 'relative',
          animation: 'scaleIn 0.2s ease-out forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx global>{followUpCardStyles}</style>
        <div className="py-3 pr-3 pl-4 font-medium text-sm text-primary flex justify-between border-b border-border bg-muted">
          <span>Ask a Question</span>
          <button 
            className="text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              if (!isProcessing) {
                onCancel();
              }
            }}
            disabled={isProcessing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
            placeholder="Type your question here..."
            value={question}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus={true}
            disabled={isProcessing}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button 
              className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.stopPropagation();
                if (!isProcessing) {
                  setIsProcessing(true);
                  onSave(parentNode.id, "Give an example");
                }
              }}
              disabled={isProcessing}
            >
              Give an example
            </button>
            <button 
              className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.stopPropagation();
                if (!isProcessing) {
                  setIsProcessing(true);
                  onSave(parentNode.id, "Add more details");
                }
              }}
              disabled={isProcessing}
            >
              Add more details
            </button>
          </div>
          <div className="flex justify-end mt-4 space-x-2 text-sm">
            <button 
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={!question.trim() || isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
            >
              {isProcessing ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Ask'
              )}
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