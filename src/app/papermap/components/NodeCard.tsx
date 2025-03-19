import React, { useRef, useState, useEffect, CSSProperties } from 'react';
import Draggable from 'react-draggable';
import { MindMapNode, NodePosition } from './MindMapTypes';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

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
  selectionClass?: string; // Add the selection class prop
  onResize?: (nodeId: string, width: number, height: number) => void;
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
  style = {}, // Default to empty style object
  selectionClass = '',
  onResize
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchMoveCountRef = useRef<number>(0);
  const isBeingDragged = useRef<boolean>(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [cardSize, setCardSize] = useState<{ width: number }>({ width: 300 }); // Remove height from cardSize
  const initialSize = useRef({ width: 300, height: 0 });
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [descriptionHeight, setDescriptionHeight] = useState<number>(100); // Default description height
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [isDescriptionAnimating, setIsDescriptionAnimating] = useState(false);
  const [shouldSlideUp, setShouldSlideUp] = useState(false);

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
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Replace the existing title and description state with controlled state
  const [editState, setEditState] = useState({
    title: node.title,
    description: node.description,
    isEditingTitle: false,
    isEditingDescription: false
  });

  // Replace the useEffect that syncs with node changes
  useEffect(() => {
    if (!editState.isEditingTitle && !editState.isEditingDescription) {
      setEditState(prev => ({
        ...prev,
        title: node.title,
        description: node.description
      }));
    }
  }, [node.title, node.description]);

  // Add this function near other handlers
  const adjustTextAreaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = '0';
    element.style.height = `${element.scrollHeight}px`;
  };

  // Add effect to handle initial height adjustment
  useEffect(() => {
    if (editState.isEditingTitle && titleInputRef.current) {
      adjustTextAreaHeight(titleInputRef.current);
    }
    if (editState.isEditingDescription && descriptionInputRef.current) {
      adjustTextAreaHeight(descriptionInputRef.current);
    }
  }, [editState.isEditingTitle, editState.isEditingDescription]);

  // Update description height calculation
  useEffect(() => {
    if (descriptionRef.current) {
      const content = descriptionRef.current.querySelector('.description-content');
      if (content) {
        const newContentHeight = content.scrollHeight;
        setContentHeight(newContentHeight);
        
        setShouldSlideUp(!isExpanded);
        setIsDescriptionAnimating(true);
        setDescriptionHeight(isExpanded ? newContentHeight : 0);
        
        const timer = setTimeout(() => {
          setIsDescriptionAnimating(false);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isExpanded, editState.description]);

  // Add an effect to notify parent of width changes
  useEffect(() => {
    if (onResize) {
      onResize(node.id, cardSize.width, 0);
    }
  }, [cardSize.width, node.id, onResize]);

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
    setEditState(prev => ({
      ...prev,
      isEditingTitle: true
    }));
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
    setEditState(prev => ({
      ...prev,
      isEditingDescription: true
    }));
    setTimeout(() => {
      if (descriptionInputRef.current) {
        descriptionInputRef.current.focus();
        descriptionInputRef.current.select();
      }
    }, 10);
  };

  // Save title changes
  const handleTitleSave = () => {
    const newTitle = editState.title.trim();
    if (onUpdateNode && newTitle !== '') {
      onUpdateNode(node.id, { title: newTitle });
    } else {
      setEditState(prev => ({
        ...prev,
        title: node.title
      }));
    }
    setEditState(prev => ({
      ...prev,
      isEditingTitle: false
    }));
  };

  // Save description changes
  const handleDescriptionSave = () => {
    if (onUpdateNode) {
      onUpdateNode(node.id, { description: editState.description });
    }
    setEditState(prev => ({
      ...prev,
      isEditingDescription: false
    }));
  };

  // Handle key press in inputs
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditState(prev => ({
        ...prev,
        title: node.title,
        isEditingTitle: false
      }));
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditState(prev => ({
        ...prev,
        description: node.description,
        isEditingDescription: false
      }));
    }
  };

  // Handle clicks outside the editing fields
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editState.isEditingTitle && titleInputRef.current && !titleInputRef.current.contains(e.target as Node)) {
        handleTitleSave();
      }
      if (editState.isEditingDescription && descriptionInputRef.current && !descriptionInputRef.current.contains(e.target as Node)) {
        handleDescriptionSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editState.isEditingTitle, editState.isEditingDescription, editState.title, editState.description]);

  // Modify handleResizeStart to handle both horizontal and vertical resizing
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeRef.current?.offsetWidth || 300;
    const startHeight = descriptionRef.current?.offsetHeight || contentHeight;

    const handleResize = (e: MouseEvent) => {
      if (!nodeRef.current || !descriptionRef.current) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (direction === 'right' || direction === 'corner') {
        const newWidth = Math.max(300, startWidth + deltaX);
        setCardSize({ width: newWidth });
        onResize?.(node.id, newWidth, 0);
      }
      
      if (direction === 'bottom' || direction === 'corner') {
        const newHeight = Math.max(contentHeight, startHeight + deltaY);
        setDescriptionHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Basic styles without the transform animation (which comes from the parent)
  const baseStyles: CSSProperties = {
    position: 'absolute',
    left: `${basePosition.x}px`,
    top: `${basePosition.y}px`,
    width: `${cardSize.width}px`,
    height: 'auto', // Always auto height to fit content
    zIndex: isResizing ? 1000 : 10, // Increase z-index while resizing
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isVisible ? 1 : 0,
    transition: isDragging || isResizing ? 'none' : undefined // Disable transitions during drag and resize
  };

  // Combine base styles with custom styles from parent
  const combinedStyles: CSSProperties = {
    ...baseStyles,
    ...style
  };

  // Update the return JSX, specifically the outer div styles
  return (
    <Draggable
      nodeRef={nodeRef as any}
      position={draggedPosition}
      onDrag={(e, data) => onDrag(node.id, e, data)}
      onStart={handleDragStart}
      onStop={handleDragStop}
      cancel=".no-drag" // Elements with this class won't trigger dragging
      disabled={isResizing}
    >
      <div 
        ref={nodeRef}
        className={`node-card ${selectionClass}`}
        style={{
          ...combinedStyles,
          width: cardSize.width,
          height: 'auto',
          minWidth: '300px',
          minHeight: '100px',
          transition: isDragging || isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'visible' // Add this to allow resize handles to show
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="Click to select, double-click to expand"
      >
        <div className="flex flex-col">
          {/* Title section - fixed height */}
          <div 
            className={`bg-white rounded-t-lg shadow-lg border ${isSelected ? 'border-blue-500' : 'border-gray-200'} relative p-4`}
            style={{
              ...(isSelected ? { boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.5)' } : {}),
              borderBottom: isExpanded ? 'none' : undefined,
              borderRadius: isExpanded ? '0.5rem 0.5rem 0 0' : '0.5rem',
            }}
          >
            {/* Title content */}
            <div className="flex items-center gap-2" style={{
              display: 'flex',
              alignItems: 'flex-start', 
              justifyContent: 'space-between'
            }}>
              {editState.isEditingTitle ? (
                <textarea
                  ref={titleInputRef as any}
                  className="font-bold text-lg no-drag flex-1"
                  style={{ 
                    outline: 'none',
                    border: 'none',
                    background: 'transparent',
                    width: '100%',
                    margin: '0',
                    padding: '0',
                    lineHeight: '1.3',
                    resize: 'none',
                    overflow: 'hidden',
                    display: 'block',
                    wordBreak: 'break-word'
                  }}
                  value={editState.title}
                  onChange={(e) => {
                    adjustTextAreaHeight(e.target);
                    setEditState(prev => ({ ...prev, title: e.target.value }));
                  }}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleSave}
                  rows={1}
                />
              ) : (
                <h3 
                  className="font-bold text-lg cursor-text flex-1" 
                  onDoubleClick={handleTitleDoubleClick}
                  title="Double-click to edit"
                  style={{ 
                    margin: '0', 
                    padding: '0',
                    lineHeight: '1.3',
                    minHeight: '24px',
                    display: 'block',
                    wordBreak: 'break-word'
                  }}
                >
                  {node.title}
                </h3>
              )}
              <button 
                className="text-gray-500 hover:text-gray-700 no-drag" 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(node.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '24px',
                  width: '24px',
                  minWidth: '24px',
                  padding: '0',
                  margin: '0',
                  marginTop: '2px'
                }}
              >
                {isExpanded ? (
                  <ChevronUpIcon />
                ) : (
                  <ChevronDownIcon />
                )}
              </button>
            </div>
          </div>

          {/* Description section - expandable/collapsible */}
          <div 
            ref={descriptionRef}
            className={`bg-white rounded-b-lg border ${isSelected ? 'border-blue-500' : 'border-gray-200'} relative`}
            style={{
              borderTop: 'none',
              borderRadius: '0 0 0.5rem 0.5rem',
              height: isExpanded ? `${descriptionHeight}px` : '0',
              minHeight: isExpanded ? `${contentHeight}px` : '0',
              transitionProperty: 'height, opacity',
              transitionDuration: isResizing ? '0s' : '0.1s',
              transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
              overflow: 'hidden',
              opacity: isExpanded ? 1 : 0,
              visibility: (isExpanded || isDescriptionAnimating) ? 'visible' : 'hidden'
            }}
          >
            <div 
              className="p-4 h-full overflow-hidden description-content"
              style={{
                opacity: isExpanded ? 1 : 0,
                transform: isExpanded ? 'translateY(0)' : 'translateY(-12px)',
                transition: isResizing ? 'none' : 'all 0.1s cubic-bezier(0.4, 0.0, 0.2, 1)',
                willChange: 'transform, opacity'
              }}
            >
              {editState.isEditingDescription ? (
                <textarea
                  ref={descriptionInputRef}
                  className="text-sm text-gray-600 w-full no-drag resize-none"
                  style={{ 
                    outline: 'none',
                    border: 'none',
                    background: 'transparent',
                    width: '100%',
                    overflow: 'hidden',
                    display: 'block',
                    wordBreak: 'break-word',
                    minHeight: '1.5em',
                    height: 'auto'
                  }}
                  value={editState.description}
                  onChange={(e) => {
                    adjustTextAreaHeight(e.target);
                    setEditState(prev => ({ ...prev, description: e.target.value }));
                  }}
                  onKeyDown={handleDescriptionKeyDown}
                  onBlur={handleDescriptionSave}
                  placeholder="Double-click to add description"
                  rows={1}
                />
              ) : (
                <p 
                  className="text-sm text-gray-600 cursor-text"
                  style={{
                    minHeight: '1.5em' // Ensure at least one line is always visible
                  }}
                  onDoubleClick={handleDescriptionDoubleClick}
                  title="Double-click to edit"
                >
                  {node.description || "Double-click to add description"}
                </p>
              )}
            </div>

            {/* Bottom resize handle */}
            <div 
              className="absolute right-0 bottom-0 left-0 h-3 cursor-ns-resize hover:bg-blue-200 opacity-0 hover:opacity-20"
              onMouseDown={(e) => handleResizeStart(e, 'bottom')}
              style={{ 
                bottom: '-6px',
                zIndex: 1000
              }}
            />
          </div>
        </div>

        {/* Width resize handle - always visible */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-200 opacity-0 hover:opacity-20"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
          style={{ 
            touchAction: 'none',
            right: '-6px',
            zIndex: 15, // Lower z-index than toggle button
            pointerEvents: 'auto',
            // Disable pointer events in the middle section where the toggle button is
            clipPath: 'polygon(0 0, 100% 0, 100% calc(20px - 6px), 0 calc(20px - 6px), 0 calc(20px + 30px), 100% calc(20px + 30px), 100% 100%, 0 100%)'
          }}
        />

        {/* Children toggle indicator - now with higher z-index */}
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
              right: '-12px',
              transform: isResizing ? 'none' : 'translateX(0)', // Important: don't use transform during resize
              transition: isResizing ? 'none' : 'all 0.1s ease-out', // Smooth transition when not resizing
              pointerEvents: 'auto' // Ensure pointer events work
            }}
            title={areChildrenHidden ? "Show children" : "Hide children"}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleChildren) {
                onToggleChildren(node.id);
              }
            }}
          >
            {areChildrenHidden ? "+" : "-"}
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default NodeCard;