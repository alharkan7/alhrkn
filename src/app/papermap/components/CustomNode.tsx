import { useState, useEffect, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import '@reactflow/node-resizer/dist/style.css';
import FollowUpCard from './FollowUpCard';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, FileText, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { STICKY_NOTE_COLORS, BLANK_NODE_COLOR, ANSWER_NODE_COLOR, stickyNoteStyles, nodeAnimationStyles } from '../styles/styles';

// Node component props type
interface CustomNodeProps {
  data: {
    title: string;
    description: string;
    updateNodeData?: (id: string, newData: { title?: string; description?: string; width?: number; pageNumber?: number }) => void;
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
    layoutDirection?: 'LR' | 'TB' | 'RL' | 'BT'; // Current layout direction
    deleteNode?: (nodeId: string) => void; // Add this line
  };
  id: string;
  selected?: boolean; // Add selected prop
}

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  // Check if this is a QnA node
  const isQnANode = data.nodeType === 'qna';

  // Check if this is a blank node by title
  const isBlankNode = data.title === 'Double Click to Edit';

  // Get color based on node type or column level
  let nodeColor;

  if (isBlankNode) {
    // Use white/plain color for blank nodes (created with + button)
    nodeColor = BLANK_NODE_COLOR;
  } else if (isQnANode) {
    // Use light blue color for answer nodes (created with follow-up questions)
    nodeColor = ANSWER_NODE_COLOR;
  } else {
    // Use regular column-based color scheme for other nodes
    const columnLevel = data.columnLevel || 0;
    const colorIndex = columnLevel % STICKY_NOTE_COLORS.length;
    nodeColor = STICKY_NOTE_COLORS[colorIndex];
  }

  // Determine handle positions based on layout direction
  const isHorizontalFlow = !data.layoutDirection || data.layoutDirection === 'LR' || data.layoutDirection === 'RL';
  console.log(`Node ${id} layout flow: ${isHorizontalFlow ? 'horizontal' : 'vertical'}, direction: ${data.layoutDirection || 'undefined'}`);
  const sourcePosition = isHorizontalFlow ? Position.Right : Position.Bottom;
  const targetPosition = isHorizontalFlow ? Position.Left : Position.Top;

  // Debug logging
  useEffect(() => {
    console.log(`CustomNode ${id} rendering with addFollowUpNode:`, data.addFollowUpNode ? 'available' : 'not available');
    console.log(`CustomNode ${id} rendering with layoutDirection:`, data.layoutDirection || 'undefined');
    if (isQnANode) {
      console.log(`Node ${id} is a QnA node`);
    }
  }, [id, data.addFollowUpNode, isQnANode, data.layoutDirection]);

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
    if (data.openPdfViewer) {
      // Ensure pageNumber is valid, default to page 1 if not
      const pageToOpen = data.pageNumber && data.pageNumber > 0 ? data.pageNumber : 1;
      data.openPdfViewer(pageToOpen);
    }
  };

  const handleChildrenToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.toggleChildrenVisibility) {
      data.toggleChildrenVisibility(id);
    }
  };

  const handleAddBlankChildNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.addFollowUpNode) {
      // Create a blank child node with placeholder title and default description
      data.addFollowUpNode(id, 'Double Click to Edit', 'Double-click to add a description', undefined);
    }
  };

  // Use the imported handleFollowUpSave but bind it to this component's context
  const handleFollowUpSave = async (parentId: string, question: string) => {
    if (!data.addFollowUpNode) {
      console.error('Cannot create follow-up: addFollowUpNode function not available');
      return '';
    }
    
    // Hide the follow-up card
    setShowFollowUpCard(false);
    
    // Create a loading child node immediately
    const nodeId = data.addFollowUpNode(
      id, 
      question, // Use the question as the title
      '<div class="flex items-center justify-center p-2"><div class="animate-pulse text-blue-600 font-medium">Answering...</div></div>', // Loading indicator
      undefined // Let the system generate a node ID
    );
    
    try {
      // Get chat history from localStorage instead of sessionId
      const rawChatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      
      // Ensure chat history has the correct role format for Gemini API
      const chatHistory = rawChatHistory.map((msg: any) => ({
        ...msg,
        role: msg.role === 'assistant' ? 'model' : msg.role
      }));
      
      // Get the fileUri from localStorage if available
      const fileUri = localStorage.getItem('pdfFileUri');
      
      // Call API endpoint with follow-up question
      const response = await fetch('/api/papermap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFollowUp: true,
          question: question,
          fileUri: fileUri, // Include fileUri if available
          nodeContext: {
            title: data.title,
            description: data.description
          },
          chatHistory: chatHistory
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get answer');
      }
      
      const result = await response.json();
      
      // Save updated chat history to localStorage
      if (result.chatHistory) {
        localStorage.setItem('chatHistory', JSON.stringify(result.chatHistory));
        console.log('Saved updated chat history to localStorage');
      }
      
      if (result.success && result.answer) {
        // Update the child node with the answer
        if (data.updateNodeData) {
          data.updateNodeData(nodeId, { description: result.answer });
        }
        
        return nodeId;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error processing follow-up question:', error);
      // Update the child node with error message
      if (data.updateNodeData) {
        data.updateNodeData(
          nodeId,
          { description: `Failed to get answer: ${error instanceof Error ? error.message : 'Unknown error'}` }
        );
      }
      return nodeId;
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
    style.innerHTML = nodeAnimationStyles;
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
      styleEl.textContent = stickyNoteStyles;
      document.head.appendChild(styleEl);
    }

    // No need to clean up since we're sharing a single style element across all nodes
  }, []);

  // Ensure border styles are consistent to prevent conflicts
  useEffect(() => {
    if (!nodeRef.current) return;

    // Function to ensure consistent border styles
    const ensureConsistentStyles = () => {
      const nodeElement = nodeRef.current;
      if (!nodeElement) return;

      // Ensure the parent ReactFlow node has consistent border style
      const reactFlowNode = nodeElement.closest('.react-flow__node');
      if (reactFlowNode && reactFlowNode instanceof HTMLElement) {
        if (reactFlowNode.style.borderColor && !reactFlowNode.style.border) {
          // If borderColor is set without border, fix it
          const color = reactFlowNode.style.borderColor;
          reactFlowNode.style.border = `2px solid ${color}`;
          reactFlowNode.style.borderColor = '';
        }
      }
    };

    // Run once on mount and whenever relevant props change
    ensureConsistentStyles();

    // Set up a MutationObserver to watch for style changes
    const observer = new MutationObserver(ensureConsistentStyles);
    observer.observe(nodeRef.current, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true
    });

    return () => observer.disconnect();
  }, [id, width, selected, isResizing]);

  // Add handler for delete button click
  const handleDeleteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  // Add handler for confirming deletion
  const handleConfirmDelete = () => {
    if (data.deleteNode) {
      data.deleteNode(id);
    }
    setShowDeleteConfirm(false);
  };

  // Add handler for canceling deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
      <div
        className={`p-4 rounded-lg shadow-md relative group sticky-note ${showFollowUpCard ? 'active-with-followup' : ''}`}
        style={{
          backgroundColor: nodeColor.bg,
          border: isResizing
            ? '1px solid #3b82f6'
            : selected
              ? '1px solid #3182CE'
              : `1px solid ${nodeColor.border}`,
          width: `${width}px`,
          height: 'auto',
          minHeight: 'fit-content',
          transition: isResizing ? 'none' : 'border 0.3s, box-shadow 0.3s',
          userSelect: isResizing ? 'none' : 'auto',
          boxShadow: selected
            ? '0 0 0 2px rgba(49, 130, 206, 0.5)'
            : `0 5px 10px ${nodeColor.shadow}, 2px 2px 4px rgba(0, 0, 0, 0.1)`,
          zIndex: selected || isHovering || showFollowUpCard ? 1001 : 'auto',
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

        {/* Input handle on left side */}
        <Handle
          type="target"
          position={targetPosition}
          style={{
            background: nodeColor.border,
            width: '10px',
            height: '10px',
            opacity: 0,
            border: 'none'
          }}
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
          <div className="flex flex-shrink-0">
            <button
              className="mt-1 font-bold text-gray-800"
              onClick={toggleExpanded}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Description container - always rendered but with animation */}
        {!showInfo && (
          <div className={`node-description-wrapper ${!expanded ? 'collapsed' : ''}`}>
            <div
              className={`node-description-content ${expanded ? 'expanded' : 'collapsed'}`}
              onTransitionEnd={() => updateNodeInternals(id)}
            >
              {editingDescription ? (
                <div>
                  <textarea
                    ref={descriptionRef}
                    value={descriptionValue}
                    onChange={(e) => handleTextAreaChange(e, setDescriptionValue)}
                    onBlur={handleDescriptionBlur}
                    onKeyDown={(e) => handleKeyDown(e, 'description')}
                    className="w-full text-sm resize-none overflow-hidden font-mono"
                    style={{
                      outline: 'none',
                      border: 'none',
                      padding: 0,
                      minHeight: '2rem',
                      background: 'transparent',
                      boxShadow: 'none'
                    }}
                    placeholder="Markdown formatting supported"
                  />
                  <div className="text-xs text-gray-500 mt-1 italic">
                    Supports markdown: **bold**, *italic*, lists, `code`, etc.
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm cursor-text"
                  onDoubleClick={handleDescriptionDoubleClick}
                >
                  {/* Render loading animation if description contains HTML */}
                  {data.description.includes('<div class=') ? (
                    <div dangerouslySetInnerHTML={{ __html: data.description }} />
                  ) : (
                    /* Otherwise render description as markdown */
                    <div className="markdown-content prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-1 prose-blockquote:my-1" style={{ color: 'rgba(0, 0, 0, 0.85)' }}>
                      <ReactMarkdown>
                        {extractMarkdownContent(data.description) || 'Double-click to add a description'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Output handle on right side - Invisible but functional */}
        <Handle
          type="source"
          position={sourcePosition}
          style={{
            background: nodeColor.border,
            width: '10px',
            height: '10px',
            zIndex: 100,
            opacity: 0, // Make invisible while keeping functionality
            border: 'none'
          }}
          id="source"
        />

        {/* Floating chat and document buttons - only show when hovering and not in other states */}
        {isHovering && !editingTitle && !editingDescription && !showFollowUpCard && (
          <div
            className={`absolute ${isHorizontalFlow ? '-bottom-6 left-1/2 transform -translate-x-1/2' : 'right-[-20px] top-1/2 transform -translate-y-1/2'} cursor-pointer flex ${isHorizontalFlow ? 'space-x-1' : 'flex-col space-y-1'}`}
            style={{ zIndex: 1000 }}
            data-exclude-from-export="true"
          >
            {/* Document icon button - show only if pageNumber is available */}
            {data.pageNumber && data.openPdfViewer && (
              <button
                className="bg-card hover:outline outline-1.5 outline-border p-2 rounded-full shadow-md transition-all flex items-center justify-center w-8 h-8 border border-border dark:bg-slate-800 dark:border-slate-700"
                onClick={handleDocumentButtonClick}
                title={`View page ${data.pageNumber} in the PDF`}
              >
                <FileText className="h-6 w-6 text-foreground" />
              </button>
            )}

            {/* Add blank child node button - show for all nodes */}
            {showChatButton && (
              <button
                className="bg-card hover:outline outline-1.5 outline-border p-2 rounded-full shadow-md transition-all flex items-center justify-center w-8 h-8 border border-border dark:bg-slate-800 dark:border-slate-700"
                onClick={handleAddBlankChildNode}
                title="Add blank child node"
              >
                <Plus className="h-5 w-5 text-foreground" />
              </button>
            )}

            {/* Chat button for follow-up questions - only show for non-blank nodes */}
            {showChatButton && data.title !== 'Double Click to Edit' && (
              <button
                className="bg-card hover:outline outline-1.5 outline-border p-2 rounded-full shadow-md transition-all flex items-center justify-center w-8 h-8 border border-border dark:bg-slate-800 dark:border-slate-700"
                onClick={handleChatButtonClick}
                title="Ask a follow-up question"
              >
                <MessageCircle className="h-5 w-5 text-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Toggle children visibility button */}
        {data.hasChildren && (
          <div
            className={`absolute ${isHorizontalFlow
              ? 'right-0 top-1/2 transform translate-x-[10px] -translate-y-1/2'
              : 'bottom-0 left-1/2 transform translate-y-[10px] -translate-x-1/2'} cursor-pointer`}
            onClick={handleChildrenToggle}
            style={{ zIndex: 1001 }}
            title={data.childrenCollapsed ? "Show children" : "Hide children"}
            data-exclude-from-export="true"
          >
            <div className={`w-5 h-5 bg-muted rounded-full flex items-center justify-center border border-border dark:bg-slate-800 dark:border-slate-700 transition-colors`}>
              <span className="text-xs font-bold">
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
            onSave={handleFollowUpSave}
            onCancel={handleFollowUpCancel}
          />
        )}

        {/* Delete button - only show when node is selected */}
        {selected && !showDeleteConfirm && (
          <div
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 cursor-pointer"
            style={{ zIndex: 1000 }}
          >
            <button
              className="bg-red-100 hover:bg-red-200 hover:outline outline-1.5 outline-red-400 p-2 rounded-full shadow-md transition-all flex items-center justify-center w-8 h-8 border border-red-300 dark:bg-red-900 dark:border-red-700"
              onClick={handleDeleteButtonClick}
              title="Delete node"
              data-exclude-from-export="true"
            >
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-300" />
            </button>
          </div>
        )}

        {/* Confirmation dialog */}
        {showDeleteConfirm && (
          <div
            className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-card p-3 rounded-lg shadow-lg border border-border dark:bg-slate-800 dark:border-slate-700"
            style={{ zIndex: 1002, minWidth: '200px' }}
            data-exclude-from-export="true"
          >
            <p className="text-sm mb-3 text-center">Are you sure you want to delete this node?</p>
            <div className="flex justify-center space-x-2">
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
  );
};

// Add this utility function at the top of the file (after imports)
const extractMarkdownContent = (content: string): string => {
  if (!content) return '';

  // First attempt: Try to directly parse as JSON
  if (content.trim().startsWith('{') && content.includes('"answer"')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.answer) {
        return parsed.answer;
      }
    } catch (e) {
      console.log('Failed to parse as JSON object, trying other methods');
    }
  }

  // Second attempt: Find JSON by manually locating braces
  const openBraceIndex = content.indexOf('{');
  const closeBraceIndex = content.lastIndexOf('}');

  if (openBraceIndex >= 0 && closeBraceIndex > openBraceIndex) {
    const potentialJson = content.substring(openBraceIndex, closeBraceIndex + 1);

    try {
      const parsed = JSON.parse(potentialJson);
      if (parsed.answer) {
        return parsed.answer;
      }
    } catch (e) {
      // Try with unescaped version
      try {
        const unescaped = potentialJson
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');

        const parsed = JSON.parse(unescaped);
        if (parsed.answer) {
          return parsed.answer;
        }
      } catch (e2) {
        console.log('Failed to parse potential JSON with unescaping');
      }
    }
  }

  // Third attempt: Check if content is just a code block
  const codeBlockStart = content.indexOf('```');
  if (codeBlockStart >= 0) {
    const afterLanguage = content.indexOf('\n', codeBlockStart);
    const codeBlockEnd = content.indexOf('```', afterLanguage);

    if (afterLanguage >= 0 && codeBlockEnd > afterLanguage) {
      const codeContent = content.substring(afterLanguage + 1, codeBlockEnd).trim();

      // If the code content itself looks like JSON with an answer field, try to parse it
      if (codeContent.includes('"answer"')) {
        try {
          const parsed = JSON.parse(codeContent);
          if (parsed.answer) {
            return parsed.answer;
          }
        } catch (e) {
          // Just return the code content if we can't parse it
          return codeContent;
        }
      }

      return codeContent;
    }
  }

  // Just return the original content if all extraction attempts fail
  return content;
};

export default CustomNode; 