import React, { useRef, useState, useEffect } from 'react';
import { MindMapNode, NodePosition } from './MindMapTypes';
import Draggable from 'react-draggable';

interface FollowUpCardProps {
  parentNode: MindMapNode;
  basePosition: NodePosition;
  onSave: (parentId: string, question: string) => void;
  onCancel: () => void;
}

const FollowUpCard: React.FC<FollowUpCardProps> = ({
  parentNode,
  basePosition,
  onSave,
  onCancel
}) => {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  
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
      onSave(parentNode.id, question);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  const handleSave = () => {
    if (question.trim()) {
      onSave(parentNode.id, question);
    }
  };
  
  return (
    <div className="follow-up-card-container" style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      <Draggable 
        handle=".follow-up-handle" 
        defaultPosition={{ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 }}
        nodeRef={dragRef as React.RefObject<HTMLElement>}
        bounds="parent"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div 
          ref={dragRef}
          className="follow-up-card" 
          style={{ 
            position: 'absolute',
            width: '300px',
            pointerEvents: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(59, 130, 246, 0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="follow-up-handle p-3 font-medium text-sm text-blue-600 flex justify-between cursor-move border-b border-gray-100 bg-gray-50">
            <span>Ask a Question</span>
          </div>
          <div className="p-3">
            <input
              ref={inputRef}
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your question here..."
              value={question}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex flex-wrap gap-2 mt-2">
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
            <div className="flex justify-end mt-3 space-x-2 text-sm">
              <button 
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
              >
                Cancel
              </button>
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
      </Draggable>
    </div>
  );
};

export default FollowUpCard;