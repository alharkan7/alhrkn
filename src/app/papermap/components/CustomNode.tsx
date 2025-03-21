import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Handle, Position } from 'reactflow';
import InfoTip from './InfoTip';

// Node component props type
interface CustomNodeProps {
  data: { 
    title: string; 
    description: string; 
    updateNodeData?: (id: string, newData: {title?: string; description?: string}) => void 
  };
  id: string;
}

// Memoized Custom node component to improve performance
const CustomNode = memo(({ data, id }: CustomNodeProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(data.title);
  const [descriptionValue, setDescriptionValue] = useState(data.description);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="p-4 rounded-lg bg-white border-2 border-gray-200 shadow-md w-64">
      {/* Input handle on left side */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', width: '10px', height: '10px' }}
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
            className="font-bold text-lg mb-2 cursor-text" 
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
          >
            {data.description || 'Double-click to add a description'}
          </div>
        )
      )}
      
      {/* Output handle on right side */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: '10px', height: '10px' }}
        id="source"
      />
    </div>
  );
});

// Add display name for memo component
CustomNode.displayName = 'CustomNode';

export default CustomNode; 