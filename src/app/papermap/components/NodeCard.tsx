import React, { useRef, useState, useEffect, CSSProperties } from 'react';
import Draggable from 'react-draggable';
import { MindMapNode, NodePosition } from './MindMapTypes';
import { ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, ChevronLeftIcon } from './Icons';

interface NodeCardProps {
  node: MindMapNode;
  basePosition: NodePosition;
  draggedPosition: NodePosition;
  isExpanded: boolean;
  hasChildren: boolean;
  areChildrenHidden: boolean;
  onDrag: (nodeId: string, e: any, data: { x: number, y: number }) => void;
  onToggleExpand: (nodeId: string) => void;
  onToggleChildren?: (nodeId: string) => void;
  onDragStop?: () => void;
  onUpdateNode?: (nodeId: string, updates: Partial<MindMapNode>) => void;
  registerToggleButtonRef?: (nodeId: string, ref: HTMLDivElement | null) => void;
  isVisible?: boolean; // New prop to control animation
  style?: React.CSSProperties; // Allow custom style overrides
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  basePosition,
  draggedPosition,
  isExpanded,
  hasChildren,
  areChildrenHidden,
  onDrag,
  onToggleExpand,
  onToggleChildren,
  onDragStop,
  onUpdateNode,
  registerToggleButtonRef,
  isVisible = true, // Default to visible
  style = {} // Default to empty style object
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchMoveCountRef = useRef<number>(0);
  
  // Register the toggle button ref with the parent component
  useEffect(() => {
    if (hasChildren && toggleButtonRef.current && registerToggleButtonRef) {
      registerToggleButtonRef(node.id, toggleButtonRef.current);
    }
    
    return () => {
      if (registerToggleButtonRef) {
        registerToggleButtonRef(node.id, null);
      }
    };
  }, [node.id, hasChildren, registerToggleButtonRef, isExpanded]);
  
  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(node.title);
  const [descriptionValue, setDescriptionValue] = useState(node.description);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Handle mouse down to detect potential drag start
  const handleMouseDown = () => {
    // Set a timeout to distinguish between click and drag
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(true);
    }, 150); // Short delay to detect if it's a drag or click
  };

  // Handle mouse up to detect click vs drag
  const handleMouseUp = () => {
    // Clear the timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // If we weren't dragging, it was a click - toggle expand
    if (!isDragging) {
      onToggleExpand(node.id);
    }
    
    // Reset dragging state
    setIsDragging(false);
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    // Clear the timeout if it exists
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  // Touch event handlers
  const handleTouchStart = () => {
    touchStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
  };

  const handleTouchMove = () => {
    touchMoveCountRef.current += 1;
    if (touchMoveCountRef.current > 3) {
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    const touchDuration = Date.now() - touchStartTimeRef.current;
    
    // If it was a short touch with minimal movement, treat as a click
    if (touchDuration < 300 && touchMoveCountRef.current < 3 && !isDragging) {
      onToggleExpand(node.id);
    }
    
    setIsDragging(false);
    touchMoveCountRef.current = 0;
  };

  // Handle double click on title to edit
  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    // Focus the input after rendering
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  };

  // Handle double click on description to edit
  const handleDescriptionDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingDescription(true);
    // Focus the textarea after rendering
    setTimeout(() => {
      if (descriptionInputRef.current) {
        descriptionInputRef.current.focus();
        descriptionInputRef.current.select();
      }
    }, 10);
  };

  // Save title changes
  const handleTitleSave = () => {
    if (onUpdateNode && titleValue.trim() !== '') {
      onUpdateNode(node.id, { title: titleValue });
    } else {
      // Reset to original if empty
      setTitleValue(node.title);
    }
    setIsEditingTitle(false);
  };

  // Save description changes
  const handleDescriptionSave = () => {
    if (onUpdateNode) {
      onUpdateNode(node.id, { description: descriptionValue });
    }
    setIsEditingDescription(false);
  };

  // Handle key press in inputs
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleValue(node.title);
      setIsEditingTitle(false);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setDescriptionValue(node.description);
      setIsEditingDescription(false);
    }
  };

  // Handle clicks outside the editing fields
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isEditingTitle && titleInputRef.current && !titleInputRef.current.contains(e.target as Node)) {
        handleTitleSave();
      }
      if (isEditingDescription && descriptionInputRef.current && !descriptionInputRef.current.contains(e.target as Node)) {
        handleDescriptionSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingTitle, isEditingDescription, titleValue, descriptionValue]);

  // Basic styles without the transform animation (which comes from the parent)
  const baseStyles: CSSProperties = {
    position: 'absolute',
    left: `${basePosition.x}px`,
    top: `${basePosition.y}px`,
    width: '300px',
    zIndex: 10,
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isVisible ? 1 : 0
  };

  // Combine base styles with custom styles from parent
  const combinedStyles: CSSProperties = {
    ...baseStyles,
    ...style
  };

  return (
    <Draggable
      nodeRef={nodeRef as any}
      position={draggedPosition}
      onDrag={(e, data) => onDrag(node.id, e, data)}
      onStop={() => {
        if (onDragStop) onDragStop();
        setIsDragging(false);
      }}
      onStart={handleDragStart}
      cancel=".no-drag" // Elements with this class won't trigger dragging
    >
      <div
        ref={nodeRef}
        className="node-card transition-all duration-250 ease-out"
        style={combinedStyles}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 relative"
        >
          <div className="flex items-start gap-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                className="font-bold text-lg border rounded px-1 py-0.5 no-drag flex-1"
                style={{ outline: 'none' }}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
              />
            ) : (
              <h3 
                className="font-bold text-lg cursor-text flex-1" 
                onDoubleClick={handleTitleDoubleClick}
                title="Double-click to edit"
              >
                {node.title}
              </h3>
            )}
            <button 
              className="text-gray-500 hover:text-gray-700 no-drag mt-1" 
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronUpIcon />
              ) : (
                <ChevronDownIcon />
              )}
            </button>
          </div>
          
          {isExpanded && (
            isEditingDescription ? (
              <textarea
                ref={descriptionInputRef}
                className="text-sm text-gray-600 mt-2 border-t pt-2 w-full border rounded px-2 py-1 no-drag"
                style={{ outline: 'none' }}
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
                onBlur={handleDescriptionSave}
                rows={3}
                placeholder="Enter description..."
              />
            ) : (
              <p 
                className="text-sm text-gray-600 mt-2 border-t pt-2 cursor-text" 
                onDoubleClick={handleDescriptionDoubleClick}
                title="Double-click to edit"
              >
                {node.description || "Double-click to add description"}
              </p>
            )
          )}

          {/* Children toggle indicator on the right side */}
          {hasChildren && onToggleChildren && (
            <div 
              ref={toggleButtonRef}
              className="absolute right-0 no-drag transition-all duration-250 ease-out"
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#6366f1',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 20,
                top: '20px',
                transform: 'translateX(50%)'
              }}
              title={areChildrenHidden ? "Show children" : "Hide children"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleChildren(node.id);
              }}
            >
              {areChildrenHidden ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};

export default NodeCard; 