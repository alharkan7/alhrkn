import React, { useRef, useState, useEffect } from 'react';
import { MindMapNode, NodePosition } from './MindMapTypes';
import Draggable from 'react-draggable';
import { XIcon } from './Icons';

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
  
  return (
    <div 
      className="fixed" 
      style={{ 
        zIndex: 9999, 
        top: 0,
        left: 0,
        // This will prevent clicks outside the card from propagating
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <Draggable 
        handle=".follow-up-handle" 
        nodeRef={dragRef as React.RefObject<HTMLElement>}
        defaultPosition={{ x: basePosition.x + 20, y: basePosition.y - 100 }}
        bounds="parent"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div 
          ref={dragRef}
          className="follow-up-card absolute" 
          style={{ 
            width: '360px',
            pointerEvents: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(59, 130, 246, 0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="follow-up-handle p-3 font-medium text-sm text-blue-600 flex justify-between cursor-move border-b border-gray-100 bg-gray-50">
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
      </Draggable>
    </div>
  );
};

export default FollowUpCard;