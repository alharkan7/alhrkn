import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { MindMapNode, NodePosition } from './MindMapTypes';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface QnACardProps {
  node: MindMapNode;
  basePosition: NodePosition;
  draggedPosition: NodePosition;
  onDrag: (nodeId: string, e: any, data: { x: number, y: number }) => void;
  onDragStart?: () => void;
  onDragStop?: () => void;
  onUpdateNode?: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onSelect?: (nodeId: string, e: React.MouseEvent) => void;
  isSelected?: boolean;
  onResize?: (nodeId: string, width: number, height: number) => void;
}

const QnACard: React.FC<QnACardProps> = ({
  node,
  basePosition,
  draggedPosition,
  onDrag,
  onDragStart,
  onDragStop,
  onUpdateNode,
  onSelect,
  isSelected = false,
  onResize,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchMoveCountRef = useRef<number>(0);
  const isBeingDragged = useRef<boolean>(false);
  const [isResizing, setIsResizing] = useState(false);
  const [cardSize, setCardSize] = useState<{ width: number }>({ width: 300 });
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(true);
  
  // Editing states
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const titleContentRef = useRef<HTMLHeadingElement>(null);

  // State for title and description editing
  const [editState, setEditState] = useState({
    title: node.title,
    description: node.description,
    isEditingTitle: false,
    isEditingDescription: false
  });

  // Update from props
  useEffect(() => {
    if (!editState.isEditingTitle && !editState.isEditingDescription) {
      setEditState(prev => ({
        ...prev,
        title: node.title,
        description: node.description
      }));
    }
    
    // Add debug logging to track updates
    console.log("QnACard updated props:", {
      id: node.id,
      title: node.title,
      description: node.description?.substring(0, 30) + (node.description?.length > 30 ? "..." : ""),
      basePosition,
      isSelected
    });
  }, [node.title, node.description, basePosition, isSelected]);

  // Auto-resize text areas
  const adjustTextAreaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = '0';
    element.style.height = `${element.scrollHeight}px`;
  };

  // Handle effect for text area height adjustment
  useEffect(() => {
    if (editState.isEditingTitle && titleInputRef.current) {
      adjustTextAreaHeight(titleInputRef.current);
    }
    if (editState.isEditingDescription && descriptionInputRef.current) {
      adjustTextAreaHeight(descriptionInputRef.current);
    }
  }, [editState.isEditingTitle, editState.isEditingDescription]);

  // Notify parent of width changes
  useEffect(() => {
    if (onResize) {
      onResize(node.id, cardSize.width, 0);
    }
  }, [cardSize.width, node.id, onResize]);

  // Handle mouse down to detect potential drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't set dragging timeout if we're clicking on interactive elements
    const target = e.target as HTMLElement;
    const isToggleButton = target.closest('.toggle-button');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    const isResizeHandle = target.closest('.resize-handle');
    
    if (!isToggleButton && !isEditableField && !isResizeHandle) {
      // Handle selection first
      if (onSelect) {
        e.stopPropagation(); // Prevent event bubbling to container
        onSelect(node.id, e);
      }
      
      // Set a timeout to distinguish between click and drag
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(true);
      }, 150); // Short delay to detect if it's a drag or click
    } else {
      // For interactive elements, still stop propagation
      e.stopPropagation();
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent) => {
    // Clear the timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // Check if we're clicking on interactive elements
    const target = e.target as HTMLElement;
    const isToggleButton = target.closest('.toggle-button');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    const isResizeHandle = target.closest('.resize-handle');

    // Toggle description visibility on double-click (not on editable fields)
    if (!isDragging && !isToggleButton && !isEditableField && !isResizeHandle && e.detail === 2) {
      setIsDescriptionVisible(prev => !prev);
    }
    
    // Reset dragging state
    setIsDragging(false);
  };

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
    
    // Check for interactive elements
    const target = e.target as HTMLElement;
    const isToggleButton = target.closest('.toggle-button');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    
    // Handle selection similar to mousedown if touching the card itself
    if (!isToggleButton && !isEditableField && onSelect) {
      // For touch events, we simulate a non-shift click
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
    const isToggleButton = target.closest('.toggle-button');
    const isEditableField = target.closest('.editable-title') || target.closest('.editable-description');
    
    // If it was a short touch with minimal movement, treat as a click
    if (touchDuration < 300 && touchMoveCountRef.current < 3 && !isDragging && !isToggleButton && !isEditableField) {
      setIsDescriptionVisible(prev => !prev);
    }
    
    setIsDragging(false);
    touchMoveCountRef.current = 0;
  };

  // Handle drag start
  const handleDragStart = (e: any) => {
    e.stopPropagation();
    
    // Call onDragStart if provided
    onDragStart?.();
    
    // Set dragging state immediately
    setIsDragging(true);
    isBeingDragged.current = true;
    
    // Clear the timeout if it exists
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // CRITICAL: Aggressively disable all transitions via style injection
    document.body.classList.add('dragging-active');
    
    // Apply inline style override for this specific node
    if (nodeRef.current) {
      // Force most aggressive performance optimizations
      nodeRef.current.style.cssText += `
        will-change: transform !important;
        transition: none !important;
        animation: none !important;
      `;
      
      // Also apply to all children
      const allElements = nodeRef.current.querySelectorAll('*');
      allElements.forEach(el => {
        (el as HTMLElement).style.cssText += `
          transition: none !important;
          animation: none !important;
        `;
      });
    }
  };
  
  // Handle drag
  const handleDrag = (e: any, ui: any) => {
    e.stopPropagation();
    
    // Ensure the dragging state is set
    if (!isDragging) {
      setIsDragging(true);
    }
    
    // Scale down the deltas to ensure 1:1 movement with pointer
    const deltaX = ui.deltaX * 0.625; // Scale down by 5/8 to match pointer movement
    const deltaY = ui.deltaY * 0.625;
    
    // Pass the event to the parent handler with properly scaled drag info
    onDrag(node.id, e, { x: deltaX, y: deltaY });
  };

  // Handle drag stop
  const handleDragStop = (e: any, data: any) => {
    e.stopPropagation();
    
    setIsDragging(false);
    isBeingDragged.current = false;
    
    document.body.classList.remove('dragging-active');
    
    // Call the parent's onDragStop callback FIRST before any style changes
    if (onDragStop) {
      onDragStop();
    }
    
    // Keep transitions disabled on the nodes for a longer period
    if (nodeRef.current) {
      // Wait for the next frame to remove the style overrides
      requestAnimationFrame(() => {
        // First frame: keep transitions disabled
        if (!nodeRef.current) return;
        
        // Set up another frame to apply transitions after positions settle
        requestAnimationFrame(() => {
          // Second frame: still keep transitions off to allow positions to apply
          if (!nodeRef.current) return;
          
          setTimeout(() => {
            // After a substantial delay, restore normal behavior
            if (!nodeRef.current) return;
            
            // Apply transition styles carefully
            nodeRef.current.style.willChange = 'auto';
            nodeRef.current.style.transition = ''; // Let CSS handle it
            
            // Restore normal child element behavior
            const allElements = nodeRef.current.querySelectorAll('*');
            allElements.forEach(el => {
              (el as HTMLElement).style.transition = '';
            });
          }, 300); // Very substantial delay to ensure positions are settled
        });
      });
    }
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
        titleInputRef.current.setSelectionRange(editState.title.length, editState.title.length);
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
        descriptionInputRef.current.setSelectionRange(editState.description.length, editState.description.length);
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

  // Handle resize logic
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = nodeRef.current?.offsetWidth || 300;

    const handleResize = (e: MouseEvent) => {
      if (!nodeRef.current) return;
      
      const deltaX = e.clientX - startX;
      
      if (direction === 'right') {
        const newWidth = Math.max(200, startWidth + deltaX);
        
        // Update the DOM directly for smoother resize
        if (nodeRef.current) {
          nodeRef.current.style.width = `${newWidth}px`;
        }
        
        // Also update React state
        setCardSize({ width: newWidth });
        
        // Call onResize to update node width in parent
        onResize?.(node.id, newWidth, 0);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Final onResize call to indicate resize is complete
      if (onResize) {
        onResize(node.id, nodeRef.current?.offsetWidth || cardSize.width, 1);
      }
      
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle description visibility
  const toggleDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDescriptionVisible(prev => !prev);
  };

  // Add component mount/unmount logging
  useEffect(() => {
    console.log(`QnACard ${node.id} mounted`);
    
    return () => {
      console.log(`QnACard ${node.id} unmounting`);
    };
  }, [node.id]);

  return (
    <Draggable
      nodeRef={nodeRef as any}
      defaultPosition={{x: 0, y: 0}}
      position={undefined}
      positionOffset={draggedPosition}
      onDrag={handleDrag}
      onStart={handleDragStart}
      onStop={handleDragStop}
      cancel=".no-drag" // Elements with this class won't trigger dragging
      disabled={isResizing}
      bounds={false}
      scale={1}
      grid={[1, 1]} // Fine grid for smooth movement
    >
      <div 
        ref={nodeRef}
        className={`qna-card ${isSelected ? 'selected' : ''}`}
        data-node-id={node.id}
        data-card-type="qna"
        style={{
          position: 'absolute',
          left: basePosition.x,
          top: basePosition.y,
          width: cardSize.width,
          height: 'auto',
          minWidth: '200px',
          minHeight: '80px',
          transition: isDragging || isResizing ? 'none !important' : 'all 0.2s ease',
          overflow: 'visible',
          fontSize: '0.9rem',
          zIndex: isResizing ? 1000 : (isSelected ? 50 : 30), // Higher z-index than regular cards
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : (isResizing ? 'auto' : 'grab'),
          opacity: 1,
          willChange: isDragging || isResizing ? 'transform, width' : 'auto',
          // Force proper interaction
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="Click to select, double-click to toggle answer"
      >
        <div className="flex flex-col">
          {/* Title section - question part */}
          <div 
            className={`bg-indigo-50 rounded-t-lg shadow-lg border ${isSelected ? 'border-blue-500' : 'border-indigo-200'} relative`}
            style={{
              ...(isSelected ? { boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.5)' } : {}),
              borderBottomLeftRadius: isDescriptionVisible ? 0 : '0.5rem',
              borderBottomRightRadius: isDescriptionVisible ? 0 : '0.5rem',
              borderBottom: isDescriptionVisible ? 'none' : undefined,
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem',
              overflow: 'visible',
              transition: isDragging || isResizing ? 'none' : 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
            }}
          >

            {/* Title content */}
            <div className="flex items-center gap-2 w-full mt-2" style={{
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'space-between',
              minHeight: '24px'
            }}>
              {editState.isEditingTitle ? (
                <textarea
                  ref={titleInputRef as any}
                  className="font-semibold text-sm no-drag flex-1"
                  style={{ 
                    outline: 'none',
                    border: 'none',
                    background: 'transparent',
                    width: '100%',
                    margin: '0',
                    padding: '0',
                    lineHeight: '1.5',
                    resize: 'none',
                    overflow: 'hidden',
                    display: 'block',
                    wordBreak: 'break-word',
                    minHeight: '24px'
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
                  ref={titleContentRef}
                  className="font-semibold text-sm cursor-text flex-1 text-indigo-900 editable-title" 
                  onDoubleClick={handleTitleDoubleClick}
                  title="Double-click to edit"
                  style={{ 
                    margin: '0',
                    padding: '0',
                    lineHeight: '1.5',
                    display: 'block',
                    wordBreak: 'break-word',
                    overflow: 'visible',
                    minHeight: '24px',
                    position: 'relative'
                  }}
                >
                  {node.title}
                </h3>
              )}

              {/* Toggle button */}
              <button 
                className="text-indigo-500 hover:text-indigo-700 no-drag toggle-button" 
                onClick={toggleDescription}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '20px',
                  width: '20px',
                  minWidth: '20px',
                  padding: '0',
                  margin: '0',
                  marginLeft: '8px',
                  flexShrink: 0
                }}
                title={isDescriptionVisible ? "Hide answer" : "Show answer"}
              >
                {isDescriptionVisible ? (
                  <ChevronUpIcon />
                ) : (
                  <ChevronDownIcon />
                )}
              </button>
            </div>
          </div>

          {/* Description section - answer part */}
          <div 
            className={`bg-white border ${isSelected ? 'border-blue-500' : 'border-indigo-200'} relative rounded-b-lg`}
            style={{
              borderTop: 'none',
              height: isDescriptionVisible ? 'auto' : '0',
              minHeight: isDescriptionVisible ? '50px' : '0',
              transitionProperty: 'all',
              transitionDuration: isResizing || isDragging ? '0s' : '0.2s',
              transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
              overflow: 'hidden',
              opacity: isDescriptionVisible ? 1 : 0,
              visibility: isDescriptionVisible ? 'visible' : 'hidden',
              padding: isDescriptionVisible ? '0.75rem' : '0',
            }}
          >
            <div 
              className="answer-content mt-2"
              style={{
                opacity: isDescriptionVisible ? 1 : 0,
                transition: isResizing || isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                willChange: 'opacity',
              }}
            >
              {editState.isEditingDescription ? (
                <textarea
                  ref={descriptionInputRef}
                  className="text-xs text-gray-600 w-full no-drag resize-none"
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
                  placeholder="Double-click to add answer"
                  rows={1}
                />
              ) : node.description === 'Loading answer...' ? (
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="animate-pulse flex space-x-2 items-center">
                    <div className="h-2.5 w-2.5 bg-indigo-400 rounded-full"></div>
                    <div className="h-2.5 w-2.5 bg-indigo-400 rounded-full"></div>
                    <div className="h-2.5 w-2.5 bg-indigo-400 rounded-full"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Getting answer from the paper...</p>
                </div>
              ) : (
                <p 
                  className="text-xs text-gray-600 cursor-text editable-description"
                  style={{
                    minHeight: '1.5em',
                    margin: 0
                  }}
                  onDoubleClick={handleDescriptionDoubleClick}
                  title="Double-click to edit"
                >
                  {node.description || "Double-click to add answer"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Width resize handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-200 opacity-0 hover:opacity-20 no-drag resize-handle"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
          style={{ 
            touchAction: 'none',
            right: '-6px',
            zIndex: 3,
            pointerEvents: 'auto',
          }}
        />
      </div>
    </Draggable>
  );
};

export default QnACard; 