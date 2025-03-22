import { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import InfoTip from './InfoTip';
import FollowUpCard from './FollowUpCard';
import { ChatIcon } from './Icons';

// Node component props type
interface CustomNodeProps {
  data: { 
    title: string; 
    description: string; 
    updateNodeData?: (id: string, newData: {title?: string; description?: string}) => void;
    addFollowUpNode?: (parentId: string, question: string, answer: string, customNodeId?: string) => string;
    nodeType?: 'regular' | 'qna'; // Add nodeType to identify QnA nodes
    lastCreatedNodeId?: string; // ID of the most recently created node
    hasChildren?: boolean; // Whether this node has children
    childrenCollapsed?: boolean; // Whether children are collapsed
    toggleChildrenVisibility?: (nodeId: string) => void; // Function to toggle children visibility
  };
  id: string;
}

// Custom node component
const CustomNode = ({ data, id }: CustomNodeProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [expanded, setExpanded] = useState(data.nodeType === 'qna'); // Set QnA nodes expanded by default
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(data.title);
  const [descriptionValue, setDescriptionValue] = useState(data.description);
  const [showChatButton, setShowChatButton] = useState(false);
  const [showFollowUpCard, setShowFollowUpCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();
  
  // Check if this is a QnA node
  const isQnANode = data.nodeType === 'qna';

  // Debug logging
  useEffect(() => {
    console.log(`CustomNode ${id} rendering with addFollowUpNode:`, data.addFollowUpNode ? 'available' : 'not available');
    if (isQnANode) {
      console.log(`Node ${id} is a QnA node`);
    }
  }, [id, data.addFollowUpNode, isQnANode]);

  // Update local state when data from parent changes
  useEffect(() => {
    setTitleValue(data.title);
    setDescriptionValue(data.description);
  }, [data.title, data.description]);

  // Set cursor position to end of text
  const setCursorToEnd = (element: HTMLTextAreaElement) => {
    const length = element.value.length;
    element.setSelectionRange(length, length);
  };

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      // Reset height first to ensure accurate calculation
      titleRef.current.style.height = '0';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
      // Set cursor at the end
      setCursorToEnd(titleRef.current);
    }
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
      // Reset height first to ensure accurate calculation
      descriptionRef.current.style.height = '0';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
      // Set cursor at the end
      setCursorToEnd(descriptionRef.current);
    }
  }, [editingTitle, editingDescription]);

  const handleTitleDoubleClick = () => {
    setEditingTitle(true);
    setShowInfo(false);
  };

  const handleDescriptionDoubleClick = () => {
    setEditingDescription(true);
    setShowInfo(false);
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (data.updateNodeData && titleValue !== data.title) {
      data.updateNodeData(id, { title: titleValue });
    }
  };

  const handleDescriptionBlur = () => {
    setEditingDescription(false);
    if (data.updateNodeData && descriptionValue !== data.description) {
      data.updateNodeData(id, { description: descriptionValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'title' | 'description') => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (field === 'title') {
        handleTitleBlur();
      } else {
        handleDescriptionBlur();
      }
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    // Update the text value
    setter(e.target.value);
    
    // Auto-adjust height with a small delay to ensure proper calculation
    requestAnimationFrame(() => {
      e.target.style.height = '0';
      e.target.style.height = `${e.target.scrollHeight}px`;
    });
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    setShowInfo(false);
  };

  const handleChatButtonClick = () => {
    setShowFollowUpCard(true);
    setShowChatButton(false);
  };

  const handleChildrenToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.toggleChildrenVisibility) {
      data.toggleChildrenVisibility(id);
    }
  };

  const handleFollowUpSave = async (parentId: string, question: string) => {
    console.log('handleFollowUpSave called with:', { parentId, question });
    console.log('addFollowUpNode function available:', !!data.addFollowUpNode);
    
    if (!data.addFollowUpNode) {
      console.error('addFollowUpNode function not provided to node');
      alert('Error: Could not create follow-up node. Missing function reference.');
      return;
    }
    
    // Hide the card immediately
    setShowFollowUpCard(false);
    
    try {
      // Get the base64 encoded PDF data from localStorage
      const pdfData = localStorage.getItem('pdfData');
      if (!pdfData) {
        console.error('PDF data not found in localStorage');
        throw new Error('PDF data not found');
      }
      
      // Create a placeholder node immediately with loading state
      const loadingMessage = '<div class="flex items-center justify-center py-4"><div class="animate-pulse flex space-x-2"><div class="h-2 w-2 bg-blue-400 rounded-full"></div><div class="h-2 w-2 bg-blue-400 rounded-full"></div><div class="h-2 w-2 bg-blue-400 rounded-full"></div></div></div><div class="text-sm text-gray-500 text-center">Generating answer...</div>';
      
      // Generate a unique ID for the new node to reference it later
      const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the node with loading state
      const createdNodeId = data.addFollowUpNode(id, question, loadingMessage, nodeId);
      
      console.log('Created placeholder node with ID:', createdNodeId);
      
      // Start fetching the answer
      console.log('Sending question to API:', question);
      
      // Prepare node context
      const nodeContext = {
        title: data.title,
        description: data.description
      };
      
      // Send request to API
      const response = await fetch('/api/papermap/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pdfData,
          nodeContext,
          question
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`Failed to get answer: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API response received:', {
        answerLength: result.answer ? result.answer.length : 0,
        answerPreview: result.answer ? result.answer.substring(0, 50) + '...' : 'No answer'
      });
      
      if (!result.answer) {
        throw new Error('API response contained no answer');
      }
      
      // Update the existing node with the actual answer
      if (data.updateNodeData) {
        console.log('Updating node with actual answer:', createdNodeId);
        data.updateNodeData(createdNodeId, { description: result.answer });
      } else {
        console.error('Cannot update node: updateNodeData function not available');
      }
      
    } catch (error) {
      console.error('Error getting answer:', error);
      // If there's already a node with loading state, update it with error message
      if (data.updateNodeData && data.lastCreatedNodeId) {
        data.updateNodeData(data.lastCreatedNodeId, { 
          description: "Error: Could not generate an answer. Please try again."
        });
      }
    } finally {
      // Make sure chat button is hidden after processing completes
      setShowChatButton(false);
    }
  };

  const handleFollowUpCancel = () => {
    setShowFollowUpCard(false);
  };

  return (
    <div 
      className={`p-4 rounded-lg border-2 shadow-md w-64 ${isQnANode ? 'bg-blue-50' : 'bg-white'}`}
      style={{ 
        borderColor: isQnANode ? '#bfdbfe' : '#e2e8f0',
      }}
      ref={nodeRef}
      onMouseEnter={() => {
        setIsHovering(true);
        setShowChatButton(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setShowChatButton(false);
      }}
    >
      {/* Input handle on left side */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: isQnANode ? '#3b82f6' : '#555', width: '10px', height: '10px' }}
        id="target"
      />
      
      <div className="flex justify-between items-start">
        {editingTitle ? (
          <textarea
            ref={titleRef}
            value={titleValue}
            onChange={(e) => handleTextAreaChange(e, setTitleValue)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => handleKeyDown(e, 'title')}
            className="font-bold text-lg mb-2 w-full resize-none overflow-hidden"
            style={{ 
              outline: 'none', 
              border: 'none',
              padding: 0,
              minHeight: '1.5rem',
              background: 'transparent',
              boxShadow: 'none'
            }}
            rows={1}
          />
        ) : (
          <h3 
            className={`font-bold text-lg mb-2 cursor-text ${isQnANode ? 'text-blue-800' : ''}`}
            onDoubleClick={handleTitleDoubleClick}
          >
            {data.title}
          </h3>
        )}
        <div className="flex ml-2 flex-shrink-0">
          <button 
            className="text-gray-500 hover:text-blue-500"
            onClick={toggleExpanded}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>
      
      {showInfo && <InfoTip content={data.description} />}
      
      {/* Only show description when expanded */}
      {expanded && !showInfo && (
        editingDescription ? (
          <textarea
            ref={descriptionRef}
            value={descriptionValue}
            onChange={(e) => handleTextAreaChange(e, setDescriptionValue)}
            onBlur={handleDescriptionBlur}
            onKeyDown={(e) => handleKeyDown(e, 'description')}
            className="w-full text-sm resize-none overflow-hidden"
            style={{ 
              outline: 'none', 
              border: 'none',
              padding: 0,
              minHeight: '2rem',
              background: 'transparent',
              boxShadow: 'none'
            }}
          />
        ) : (
          <div 
            className="text-sm cursor-text" 
            onDoubleClick={handleDescriptionDoubleClick}
            dangerouslySetInnerHTML={
              // Check if the description contains HTML for loading animation
              data.description.includes('<div class=') 
                ? { __html: data.description } 
                : undefined
            }
          >
            {/* Only render text content if not using dangerouslySetInnerHTML */}
            {!data.description.includes('<div class=') 
              ? (data.description || 'Double-click to add a description') 
              : null
            }
          </div>
        )
      )}
      
      {/* Floating chat button - only show when hovering and not in other states */}
      {showChatButton && isHovering && !loading && !editingTitle && !editingDescription && !showFollowUpCard && (
        <div 
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 cursor-pointer"
          style={{ zIndex: 1000 }}
        >
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-md transition-all"
            onClick={handleChatButtonClick}
            title="Ask a follow-up question"
          >
            <ChatIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Display loading indicator when processing */}
      {loading && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2" style={{ zIndex: 1000 }}>
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
            Processing...
          </div>
        </div>
      )}
      
      {/* Output handle on right side */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: isQnANode ? '#3b82f6' : '#555', width: '10px', height: '10px' }}
        id="source"
      />
      
      {/* Toggle children visibility button */}
      {data.hasChildren && (
        <div 
          className="absolute right-0 top-1/2 transform translate-x-[10px] -translate-y-1/2 cursor-pointer"
          onClick={handleChildrenToggle}
          style={{ zIndex: 1001 }}
          title={data.childrenCollapsed ? "Show children" : "Hide children"}
        >
          <div className={`w-5 h-5 bg-gray-200 hover:bg-blue-100 rounded-full flex items-center justify-center border border-gray-300 transition-colors`}>
            <span className="text-xs font-bold transform translate-y-[-1px]">
              {data.childrenCollapsed ? '+' : '−'}
            </span>
          </div>
        </div>
      )}
      
      {/* FollowUp Card popup */}
      {showFollowUpCard && (
        <FollowUpCard
          parentNode={{
            id,
            title: data.title,
            description: data.description,
            parentId: null,
            level: 0
          }}
          basePosition={{ x: 0, y: 0 }}
          onSave={handleFollowUpSave}
          onCancel={handleFollowUpCancel}
        />
      )}
    </div>
  );
};

export default CustomNode; 