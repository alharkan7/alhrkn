import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { MindMapNode, NodePosition } from './MindMapTypes';
import { ChevronDownIcon, ChevronUpIcon, ChatIcon } from './Icons';

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
  onAskFollowUp?: (nodeId: string) => void;
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
  onResize,
  onAskFollowUp
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchMoveCountRef = useRef<number>(0);
  const isBeingDragged = useRef<boolean>(false);
  const [isResizing, setIsResizing] = useState(false);
  const [cardSize, setCardSize] = useState<{ width: number }>({ width: 250 }); // Reduced width from 300 to 250
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [descriptionHeight, setDescriptionHeight] = useState<number>(100); // Default description height
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [isDescriptionAnimating, setIsDescriptionAnimating] = useState(false);
  const [shouldSlideUp, setShouldSlideUp] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
  const titleContentRef = useRef<HTMLHeadingElement>(null);

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

  // Add an effect to recalculate content height when card width changes
  useEffect(() => {
    if (descriptionRef.current) {
      const content = descriptionRef.current.querySelector('.description-content');
      if (content) {
        const newContentHeight = content.scrollHeight;
        setContentHeight(newContentHeight);
        
        if (isExpanded) {
          setDescriptionHeight(newContentHeight);
        }
      }
    }
  }, [cardSize.width, isExpanded]);

  // Add an effect to notify parent of width changes
  useEffect(() => {
    if (onResize) {
      onResize(node.id, cardSize.width, 0);
    }
  }, [cardSize.width, node.id, onResize]);

  // Add effect to adjust title height based on content
  useEffect(() => {
    // Check if title content is overflowing
    if (titleContentRef.current) {
      const titleElement = titleContentRef.current;
      
      // Reset styles first to get accurate measurements
      titleElement.style.maxHeight = '';
      titleElement.style.height = '';
      
      // Check if content still overflows after reset
      const hasOverflow = titleElement.scrollHeight > titleElement.clientHeight;
      
      if (hasOverflow) {
        // Adjust the height to fit content with a small buffer
        titleElement.style.maxHeight = 'none';
        const newHeight = titleElement.scrollHeight + 5;
        titleElement.style.height = `${newHeight}px`;
      } else {
        // Content fits, so we can use default height
        titleElement.style.height = '';
      }
    }
  }, [editState.title, node.title, cardSize.width]);

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
  
  // Handle drag stop
  const handleDragStop = (e: any, data: any) => {
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

  // Modify handleResizeStart to handle both horizontal and vertical resizing
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeRef.current?.offsetWidth || 250;
    const startHeight = descriptionRef.current?.offsetHeight || contentHeight;

    const handleResize = (e: MouseEvent) => {
      if (!nodeRef.current || !descriptionRef.current) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Apply direct DOM manipulation for immediate feedback during resize
      if (direction === 'right' || direction === 'corner') {
        const newWidth = Math.max(200, startWidth + deltaX);
        
        // Update the DOM directly for smoother resize
        if (nodeRef.current) {
          nodeRef.current.style.width = `${newWidth}px`;
        }
        
        // Also update React state
        setCardSize({ width: newWidth });
        
        // Call onResize immediately to update node width in parent
        onResize?.(node.id, newWidth, 0);
      }
      
      if (direction === 'bottom' || direction === 'corner') {
        const newHeight = Math.max(contentHeight, startHeight + deltaY);
        
        // Update DOM directly
        if (descriptionRef.current) {
          descriptionRef.current.style.height = `${newHeight}px`;
        }
        
        // Also update React state
        setDescriptionHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Do a final onResize call with a third parameter of 'true' to indicate resize is complete
      if (onResize) {
        onResize(node.id, nodeRef.current?.offsetWidth || cardSize.width, 1);
      }
      
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Add handlers for hover events
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  // Add chat button click handler
  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAskFollowUp) {
      onAskFollowUp(node.id);
    }
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
      bounds={false} // Disable bounds to prevent bouncing back
      scale={1} // Ensure consistent scaling
    >
      <div 
        ref={nodeRef}
        className={`node-card ${selectionClass}`}
        data-node-id={node.id}
        style={{
          position: 'absolute',
          left: basePosition.x,
          top: basePosition.y,
          width: cardSize.width,
          height: 'auto',
          minWidth: '200px',
          minHeight: '80px',
          // Disable transitions completely during drag or resize
          transition: isDragging || isResizing ? 'none !important' : 'all 0.2s ease',
          overflow: 'visible',
          fontSize: '0.9rem',
          zIndex: isResizing ? 1000 : (isSelected ? 20 : 10),
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : (isResizing ? 'auto' : 'grab'),
          opacity: isVisible ? 1 : 0,
          willChange: isDragging || isResizing ? 'transform, width' : 'auto',
          // Allow any additional custom styles
          ...style
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Click to select, double-click to expand"
      >
        <div className="flex flex-col">
          {/* Title section - fixed height */}
          <div 
            className={`bg-white rounded-lg shadow-lg border ${isSelected ? 'border-blue-500' : 'border-gray-200'} relative`}
            style={{
              ...(isSelected ? { boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.5)' } : {}),
              borderBottomLeftRadius: isExpanded ? 0 : '0.5rem',
              borderBottomRightRadius: isExpanded ? 0 : '0.5rem',
              borderBottom: isExpanded ? 'none' : undefined,
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem',
              overflow: 'visible',
              transition: isDragging || isResizing ? 'none' : 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
            }}
          >
            {/* Title content */}
            <div className="flex items-center gap-2 w-full" style={{
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'space-between',
              minHeight: '24px' // Ensure minimum height for text
            }}>
              {editState.isEditingTitle ? (
                <textarea
                  ref={titleInputRef as any}
                  className="font-bold text-sm no-drag flex-1"
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
                    minHeight: '24px' // Match parent's min-height
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
                  className="font-bold text-sm cursor-text flex-1 node-title" 
                  onDoubleClick={handleTitleDoubleClick}
                  title="Double-click to edit"
                  style={{ 
                    margin: '0',
                    padding: '0',
                    lineHeight: '1.5',
                    display: 'block',
                    wordBreak: 'break-word',
                    overflow: 'visible',
                    minHeight: '24px', // Match parent's min-height
                    position: 'relative' // Enable proper overflow handling
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
                  height: '24px', // Match text height
                  width: '24px',
                  minWidth: '24px',
                  padding: '0',
                  margin: '0',
                  marginLeft: '8px',
                  flexShrink: 0 // Prevent button from shrinking
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
            className={`bg-white border ${isSelected ? 'border-blue-500' : 'border-gray-200'} relative`}
            style={{
              borderTop: 'none',
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem',
              height: isExpanded ? `${descriptionHeight}px` : '0',
              minHeight: isExpanded ? `${contentHeight}px` : '0',
              transitionProperty: 'all',
              transitionDuration: isResizing || isDragging ? '0s' : '0.2s',
              transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
              overflow: 'hidden',
              opacity: isExpanded ? 1 : 0,
              visibility: (isExpanded || isDescriptionAnimating) ? 'visible' : 'hidden',
              transform: `translateY(${isExpanded ? '0' : '-4px'})`
            }}
          >
            <div 
              className="description-content h-full overflow-hidden"
              style={{
                opacity: isExpanded ? 1 : 0,
                transform: `translateY(${isExpanded ? '0' : '-4px'})`,
                transition: isResizing || isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                willChange: 'transform, opacity',
                padding: '0.75rem'
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
                  placeholder="Double-click to add description"
                  rows={1}
                />
              ) : node.description === 'Loading answer...' ? (
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="animate-pulse flex space-x-2 items-center">
                    <div className="h-2.5 w-2.5 bg-blue-400 rounded-full"></div>
                    <div className="h-2.5 w-2.5 bg-blue-400 rounded-full"></div>
                    <div className="h-2.5 w-2.5 bg-blue-400 rounded-full"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Getting answer from the paper...</p>
                </div>
              ) : (
                <p 
                  className="text-xs text-gray-600 cursor-text"
                  style={{
                    minHeight: '1.5em', // Ensure at least one line is always visible
                    margin: 0
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
            zIndex: 3, // Lower z-index than connections (5) and toggle button (20)
            pointerEvents: 'auto',
            // Clip path to avoid the middle area where connection lines and toggle button are
            clipPath: 'polygon(0 0, 100% 0, 100% 15px, 0 15px, 0 35px, 100% 35px, 100% 100%, 0 100%)'
          }}
        />

        {/* Children toggle indicator - now with higher z-index */}
        {hasChildren && onToggleChildren && (
          <div 
            ref={toggleButtonRef}
            className="absolute right-0 no-drag transition-all duration-250 ease-out"
            style={{
              width: '18px',
              height: '18px',
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
              top: '25px', // Exactly at the vertical center of title div (50px height / 2)
              right: '-9px', // Position button to align with the connection line
              marginTop: '-9px', // Half of height to center it vertically
              transition: isResizing || isDragging ? 'none' : 'all 0.1s ease-out',
              pointerEvents: 'auto',
              fontSize: '10px', // Smaller font for the +/- symbol
              fontWeight: 'bold'
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

        {/* Chat button that appears on hover */}
        {isHovered && (
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 no-drag"
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
              zIndex: 20
            }}
            title="Ask a follow-up question"
            onClick={handleChatClick}
          >
            <ChatIcon />
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default NodeCard;