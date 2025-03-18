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
  onDragStart?: () => void;
  onToggleExpand: (nodeId: string) => void;
  onToggleChildren?: (nodeId: string) => void;
  onDragStop?: () => void;
  onUpdateNode?: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onSelect?: (nodeId: string, e: React.MouseEvent) => void;
  isSelected?: boolean;
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
  onDragStart,
  onToggleExpand,
  onToggleChildren,
  onDragStop,
  onUpdateNode,
  onSelect,
  isSelected = false,
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
  const isBeingDragged = useRef<boolean>(false);
  
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
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't set dragging timeout if we're clicking on interactive elements
    const target = e.target as HTMLElement;
    const isToggleOrExpand = target.closest('.toggle-expand') || target.closest('.toggle-children');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    
    if (!isToggleOrExpand && !isEditableField) {
      // Handle selection first
      if (onSelect) {
        e.stopPropagation(); // Prevent event bubbling to container
        onSelect(node.id, e);
      }
      
      // Set a timeout to distinguish between click and drag
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(true);
      }, 150); // Short delay to detect if it's a drag or click
    }
  };

  // Handle mouse up to detect click vs drag
  const handleMouseUp = (e: React.MouseEvent) => {
    // Clear the timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // Check if we're clicking on interactive elements
    const target = e.target as HTMLElement;
    const isToggleOrExpand = target.closest('.toggle-expand') || target.closest('.toggle-children');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');

    // Only toggle expansion if:
    // 1. We weren't dragging
    // 2. Not clicking on controls
    // 3. Double click (for expansion) - we're using single click for selection now
    if (!isDragging && !isToggleOrExpand && !isEditableField && e.detail === 2) {
      onToggleExpand(node.id);
    }
    
    // Reset dragging state
    setIsDragging(false);
  };

  // Handle drag start
  const handleDragStart = (e: any) => {
    // Call onDragStart if provided
    onDragStart?.();
    
    // Original drag start logic
    setIsDragging(true);
    // Clear the timeout if it exists
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };
  
  // Handle drag stop
  const handleDragStop = () => {
    if (onDragStop) onDragStop();
    setIsDragging(false);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
    
    // Check for interactive elements like we do in mousedown
    const target = e.target as HTMLElement;
    const isToggleOrExpand = target.closest('.toggle-expand') || target.closest('.toggle-children');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    
    // Handle selection similar to mousedown if touching the card itself
    if (!isToggleOrExpand && !isEditableField && onSelect) {
      // For touch events, we don't have shift key, so we simulate a non-shift click
      const simEvent = { shiftKey: false } as React.MouseEvent;
      onSelect(node.id, simEvent);
    }
  };

  const handleTouchMove = () => {
    touchMoveCountRef.current += 1;
    if (touchMoveCountRef.current > 3) {
      setIsDragging(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTimeRef.current;
    
    // Check for interactive elements
    const target = e.target as HTMLElement;
    const isToggleOrExpand = target.closest('.toggle-expand') || target.closest('.toggle-children');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    
    // If it was a short touch with minimal movement, treat as a click
    if (touchDuration < 300 && touchMoveCountRef.current < 3 && !isDragging && !isToggleOrExpand && !isEditableField) {
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
    opacity: isVisible ? 1 : 0,
    transition: isDragging ? 'none' : undefined // Disable transitions during drag
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
      onStart={handleDragStart}
      onStop={handleDragStop}
      cancel=".no-drag" // Elements with this class won't trigger dragging
    >
      <div 
        ref={nodeRef}
        className={`node-card transition-all duration-250 ease-out ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={combinedStyles}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="Click to select, double-click to expand"
      >
        <div 
          className={`bg-white p-4 rounded-lg shadow-lg border ${isSelected ? 'border-blue-500' : 'border-gray-200'} relative`}
          style={isSelected ? { boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' } : undefined}
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
                style={{ 
                  margin: '0', 
                  padding: '0', 
                  lineHeight: '1.5',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }}
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
          
          {/* Description section with animation */}
          <div 
            className="overflow-hidden transition-all duration-200 ease-in-out"
            style={{ 
              maxHeight: isExpanded ? '200px' : '0px',
              opacity: isExpanded ? 1 : 0,
              marginTop: isExpanded ? '8px' : '0px',
              borderTop: isExpanded ? '1px solid #e5e7eb' : 'none'
            }}
          >
            {isEditingDescription ? (
              <textarea
                ref={descriptionInputRef}
                className="text-sm text-gray-600 pt-2 w-full border rounded px-2 py-1 no-drag"
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
                className="text-sm text-gray-600 pt-2 cursor-text" 
                onDoubleClick={handleDescriptionDoubleClick}
                title="Double-click to edit"
              >
                {node.description || "Double-click to add description"}
              </p>
            )}
          </div>

          {/* Children toggle indicator on the right side */}
          {hasChildren && onToggleChildren && (
            <div 
              ref={toggleButtonRef}
              className="absolute right-0 no-drag transition-all duration-250 ease-out"
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6B7280',
                border: '2px solid #9CA3AF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
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
              {/* {areChildrenHidden ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )} */}
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};

export default NodeCard; 