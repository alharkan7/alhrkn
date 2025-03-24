import { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import InfoTip from './InfoTip';
import FollowUpCard from './FollowUpCard';
import { ChatIcon, DocumentIcon } from './Icons';

// Node component props type
interface CustomNodeProps {
  data: { 
    title: string; 
    description: string; 
    updateNodeData?: (id: string, newData: {title?: string; description?: string; width?: number; pageNumber?: number}) => void;
    addFollowUpNode?: (parentId: string, question: string, answer: string, customNodeId?: string) => string;
    nodeType?: 'regular' | 'qna'; // Add nodeType to identify QnA nodes
    lastCreatedNodeId?: string; // ID of the most recently created node
    hasChildren?: boolean; // Whether this node has children
    childrenCollapsed?: boolean; // Whether children are collapsed
    toggleChildrenVisibility?: (nodeId: string) => void; // Function to toggle children visibility
    width?: number; // Width of the node
    pageNumber?: number; // Page number in the PDF
    openPdfViewer?: (pageNumber: number) => void; // Function to open PDF viewer
    columnLevel?: number; // Column level for color assignment
  };
  id: string;
  selected?: boolean; // Add selected prop
}

// Define sticky note colors based on column level
const STICKY_NOTE_COLORS = [
  { bg: '#fff9c4', border: '#f9a825', shadow: 'rgba(249, 168, 37, 0.4)' }, // Yellow
  { bg: '#e1bee7', border: '#8e24aa', shadow: 'rgba(142, 36, 170, 0.4)' }, // Purple
  { bg: '#ffcdd2', border: '#e53935', shadow: 'rgba(229, 57, 53, 0.4)' },  // Red
  { bg: '#c8e6c9', border: '#43a047', shadow: 'rgba(67, 160, 71, 0.4)' },  // Green
  { bg: '#f8bbd0', border: '#d81b60', shadow: 'rgba(216, 27, 96, 0.4)' },  // Pink
  { bg: '#bbdefb', border: '#1976d2', shadow: 'rgba(25, 118, 210, 0.4)' }, // Blue
  { bg: '#ffe0b2', border: '#fb8c00', shadow: 'rgba(251, 140, 0, 0.4)' },  // Orange
];

// Simplified sticky note CSS - removed texture, optimized for performance
const STICKY_NOTE_CSS = `
  .sticky-note {
    position: relative;
    overflow: visible;
  }
  
  .sticky-note-fold {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 0 20px 20px;
    border-color: transparent transparent transparent transparent;
    opacity: 0.5;
    border-bottom-right-radius: 4px;
  }
`;

// Custom node component
const CustomNode = ({ data, id, selected }: CustomNodeProps) => {
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
  const [width, setWidth] = useState(data.width || 256); // Default width 256px (64*4)
  const [isResizing, setIsResizing] = useState(false);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  
  // Check if this is a QnA node
  const isQnANode = data.nodeType === 'qna';

  // Get color based on column level (default to first color if level not provided)
  const columnLevel = data.columnLevel || 0;
  const colorIndex = columnLevel % STICKY_NOTE_COLORS.length;
  const nodeColor = STICKY_NOTE_COLORS[colorIndex];

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
    setShowInfo(false);
    
    // Update node size immediately to prepare for animation
    updateNodeInternals(id);
    
    // Toggle expanded state after a small delay to ensure proper animation start
    requestAnimationFrame(() => {
      setExpanded(!expanded);
      
      // Update node internals after animation completes
      setTimeout(() => {
        updateNodeInternals(id);
      }, 250); // Match the transition duration (0.2s) with some buffer
    });
  };

  const handleChatButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFollowUpCard(true);
  };

  const handleDocumentButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.openPdfViewer && data.pageNumber) {
      data.openPdfViewer(data.pageNumber);
    }
  };

  const handleChildrenToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.toggleChildrenVisibility) {
      data.toggleChildrenVisibility(id);
    }
  };

  // Handler for when resizing is complete
  const onResize = (_event: any, { width, height }: { width: number; height: number }) => {
    if (data.updateNodeData) {
      data.updateNodeData(id, { width });
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
      const loadingMessage = '<div class="flex items-center justify-center py-4"><div class="animate-pulse flex space-x-2"><div class="h-2 w-2 bg-blue-400 rounded-full"></div><div class="h-2 w-2 bg-blue-400 rounded-full"></div><div class="h-2 w-2 bg-blue-400 rounded-full"></div></div></div><div class="text-sm text-gray-500 text-center">Answering...</div>';
      
      // Generate a unique ID for the new node to reference it later
      const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the node with loading state
      const createdNodeId = data.addFollowUpNode(id, question, loadingMessage, nodeId);
      
      console.log('Created placeholder node with ID:', createdNodeId);
      
      // After the placeholder node is created, update it to include the pageNumber from the parent node
      if (data.updateNodeData && data.pageNumber) {
        console.log(`Applying parent pageNumber ${data.pageNumber} to QnA node:`, createdNodeId);
        // Preserve the pageNumber from the parent node
        data.updateNodeData(createdNodeId, { pageNumber: data.pageNumber });
      }
      
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
        // Preserve pageNumber when updating the node with the answer
        data.updateNodeData(createdNodeId, { 
          description: result.answer,
          // Add pageNumber in case it wasn't added earlier
          pageNumber: data.pageNumber 
        });
      } else {
        console.error('Cannot update node: updateNodeData function not available');
      }
      
    } catch (error) {
      console.error('Error getting answer:', error);
      // If there's already a node with loading state, update it with error message
      if (data.updateNodeData && data.lastCreatedNodeId) {
        data.updateNodeData(data.lastCreatedNodeId, { 
          description: "Error: Could not generate an answer. Please try again.",
          // Also preserve pageNumber when updating with error message
          pageNumber: data.pageNumber
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

  // Update reactflow when resizing starts or ends
  useEffect(() => {
    if (isResizing) {
      // Set a data attribute that can be used by the parent ReactFlow component
      const nodeElement = nodeRef.current;
      if (nodeElement) {
        nodeElement.setAttribute('data-nodedrag', 'false');
      }
    } else {
      const nodeElement = nodeRef.current;
      if (nodeElement) {
        nodeElement.setAttribute('data-nodedrag', 'true');
      }
    }
  }, [isResizing]);

  // Update node internals when content changes or width changes
  useEffect(() => {
    // Use a small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      updateNodeInternals(id);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [id, updateNodeInternals, width, titleValue, descriptionValue, expanded]);

  // CSS to hide unwanted resize handles and fix node height
  useEffect(() => {
    // Create a style tag to add custom CSS
    const style = document.createElement('style');
    style.innerHTML = `
      .react-flow__resize-control.handle:not(.handle-right) {
        display: none !important;
      }
      
      /* Force ReactFlow to use auto height for nodes */
      .react-flow__node.react-flow__node-custom {
        height: auto !important;
        overflow: visible !important;
      }
      
      /* Animation for description */
      .node-description-wrapper {
        overflow: hidden;
        transition: height 0.2s ease-in-out;
        height: auto;
      }
      
      .node-description-wrapper.collapsed {
        height: 0;
      }
      
      .node-description-content {
        transform-origin: top;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }
      
      .node-description-content.expanded {
        transform: scaleY(1);
        opacity: 1;
      }
      
      .node-description-content.collapsed {
        transform: scaleY(0);
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
    
    // Clean up
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Use MutationObserver to detect content height changes and update node
  useEffect(() => {
    if (!nodeRef.current) return;
    
    const observer = new MutationObserver(() => {
      // Force node update when content changes
      updateNodeInternals(id);
    });
    
    observer.observe(nodeRef.current, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
    
    return () => observer.disconnect();
  }, [id, updateNodeInternals]);

  // Measure node content and synchronize with ReactFlow
  useEffect(() => {
    if (!nodeRef.current) return;

    // Function to measure and update node dimensions
    const syncNodeSize = () => {
      const nodeElement = nodeRef.current;
      if (!nodeElement) return;
      
      // Force a reflow to ensure accurate measurements
      void nodeElement.offsetHeight;
      
      // Get actual content height
      const contentHeight = nodeElement.getBoundingClientRect().height;
      
      // Update ReactFlow node dimensions
      updateNodeInternals(id);
      
      // Access parent ReactFlow node if possible and update its height
      const reactFlowNode = nodeElement.closest('.react-flow__node');
      if (reactFlowNode && reactFlowNode instanceof HTMLElement) {
        reactFlowNode.style.height = `${contentHeight}px`;
      }
    };

    // Sync node size initially
    syncNodeSize();
    
    // Sync node size after resize and when content changes
    const resizeObserver = new ResizeObserver(() => {
      syncNodeSize();
    });
    
    resizeObserver.observe(nodeRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [id, updateNodeInternals, width, expanded]);

  useEffect(() => {
    console.log(`Node ${id}: pageNumber=${data.pageNumber}, openPdfViewer=${!!data.openPdfViewer}`);
  }, [id, data.pageNumber, data.openPdfViewer]);

  // Add debug logging for document button visibility conditions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Node ${id} document button conditions:`, { 
        pageNumber: data.pageNumber, 
        hasOpenPdfFn: !!data.openPdfViewer,
        isHovering,
        loading,
        editingTitle,
        editingDescription,
        showFollowUpCard
      });
    }
  }, [id, data.pageNumber, data.openPdfViewer, isHovering, loading, editingTitle, editingDescription, showFollowUpCard]);

  // Add optimized sticky note style to document - only once
  useEffect(() => {
    // Check if style already exists to prevent duplicates
    const existingStyle = document.getElementById('sticky-note-style');
    if (!existingStyle) {
      const styleEl = document.createElement('style');
      styleEl.id = 'sticky-note-style';
      styleEl.textContent = STICKY_NOTE_CSS;
      document.head.appendChild(styleEl);
    }
    
    // No need to clean up since we're sharing a single style element across all nodes
  }, []);

  return (
    <>
      {/* Add NodeResizer component - only visible when selected */}
      <NodeResizer 
        minWidth={200}
        minHeight={50}
        isVisible={selected}
        onResizeStart={() => setIsResizing(true)}
        onResize={(e, { width, height }) => {
          setWidth(width);
          
          // Update node internals during resize to ensure height recalculates
          requestAnimationFrame(() => {
            // Access parent ReactFlow node and update its dimensions
            if (nodeRef.current) {
              const reactFlowNode = nodeRef.current.closest('.react-flow__node');
              if (reactFlowNode && reactFlowNode instanceof HTMLElement) {
                const contentHeight = nodeRef.current.getBoundingClientRect().height;
                reactFlowNode.style.height = `${contentHeight}px`;
              }
            }
            updateNodeInternals(id);
          });
        }}
        onResizeEnd={(e, params) => {
          setIsResizing(false);
          onResize(e, params);
          
          // Update node internals after resize completes
          setTimeout(() => {
            updateNodeInternals(id);
          }, 50);
        }}
        handleStyle={{
          width: '8px',
          height: '8px',
          backgroundColor: 'transparent',
          borderRadius: '50%',
          zIndex: 1002,
          border: '0',
          boxShadow: 'none',
          opacity: 0.5
        }}
        lineStyle={{
          borderWidth: '0',
          borderColor: 'transparent',
          borderStyle: 'none',
          zIndex: 1002
        }}
      />
      
      <div 
        className="p-4 rounded-lg shadow-md relative group sticky-note"
        style={{ 
          backgroundColor: nodeColor.bg,
          borderColor: isResizing ? '#3b82f6' : selected ? '#3182CE' : nodeColor.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          width: `${width}px`,
          height: 'auto',
          minHeight: 'fit-content',
          transition: isResizing ? 'none' : 'border-color 0.3s, box-shadow 0.3s',
          userSelect: isResizing ? 'none' : 'auto',
          boxShadow: selected 
            ? '0 0 0 2px rgba(49, 130, 206, 0.5)' 
            : `0 5px 10px ${nodeColor.shadow}, 2px 2px 4px rgba(0, 0, 0, 0.1)`,
          zIndex: selected || isHovering ? 1001 : 'auto',
          transformOrigin: 'center',
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
        {/* Paper fold effect - bottom right corner */}
        {/* <div 
          className="sticky-note-fold" 
          style={{ 
            borderBottomColor: nodeColor.border,
          }}
        /> */}
        
        {/* Input handle on left side */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: nodeColor.border, width: '10px', height: '10px', opacity: 0 }}
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
              style={{ color: nodeColor.border }}
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
        
        {/* Description container - always rendered but with animation */}
        {!showInfo && (
          <div className={`node-description-wrapper ${!expanded ? 'collapsed' : ''}`}>
            <div 
              className={`node-description-content ${expanded ? 'expanded' : 'collapsed'}`}
              onTransitionEnd={() => updateNodeInternals(id)}
            >
              {editingDescription ? (
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
              )}
            </div>
          </div>
        )}
        
        {/* Output handle on right side - Invisible but functional */}
        <Handle
          type="source"
          position={Position.Right}
          style={{ 
            background: nodeColor.border, 
            width: '10px', 
            height: '10px',
            zIndex: 100,
            opacity: 0 // Make invisible while keeping functionality
          }}
          id="source"
        />
        
        {/* Floating chat and document buttons - only show when hovering and not in other states */}
        {isHovering && !loading && !editingTitle && !editingDescription && !showFollowUpCard && (
          <div 
            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 cursor-pointer flex space-x-2"
            style={{ zIndex: 1000 }}
          >
            {showChatButton && (
              <button
                className="bg-white hover:outline outline-1.5 outline-gray-500 p-2 rounded-full shadow-md transition-all flex items-center justify-center w-8 h-8 border border-gray-200"
                onClick={handleChatButtonClick}
                title="Ask a follow-up question"
              >
                <ChatIcon className="h-5 w-5" />
              </button>
            )}
            
            {/* Document icon button - show only if pageNumber is available */}
            {data.pageNumber && data.openPdfViewer && (
              <button
                className="bg-white hover:outline outline-1.5 outline-gray-500 p-2 rounded-full shadow-md transition-all flex items-center justify-center w-8 h-8 border border-gray-200"
                onClick={handleDocumentButtonClick}
                title={`View page ${data.pageNumber} in the PDF`}
              >
                <DocumentIcon className="h-6 w-6 text-gray-500" />
              </button>
            )}
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
            basePosition={{ x: (data.width || 250) + 20, y: 100 }}
            onSave={handleFollowUpSave}
            onCancel={handleFollowUpCancel}
          />
        )}
      </div>
    </>
  );
};

export default CustomNode; 