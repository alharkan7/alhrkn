// import { Styles } from 'reactflow'; // Removed unused import

export const nodeUpdateStyles = `
  @keyframes node-updated {
    0% { border: 2px solid #4299e1; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.3); }
    100% { border: 2px solid #e2e8f0; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); }
  }
  .node-card {
    /* Remove global transition to avoid lag during dragging */
  }
  /* Only apply transitions for specific actions like selection, not during drag */
  .node-card.updating {
    transition: all 0.2s ease;
  }
  .node-card textarea {
    font-family: inherit;
    line-height: 1.4;
  }
  textarea:focus {
    outline: none;
  }
  .react-flow__node.selected .node-card {
    border: 2px solid #4299E1 !important;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.3) !important;
  }
  
  /* Resizer styling */
  .react-flow__resize-control {
    z-index: 100 !important;
  }
  .react-flow__resize-control.handle {
    background-color: #4299E1 !important;
    border: 1px solid white !important;
  }
  .react-flow__resize-control.handle-right {
    cursor: e-resize !important;
  }
  .react-flow__resize-control.handle-bottom {
    cursor: s-resize !important;
  }
  .react-flow__resize-control.handle-left {
    cursor: w-resize !important;
  }
  .react-flow__resize-control.handle-top {
    cursor: n-resize !important;
  }
  .react-flow__resize-control.handle-bottom.handle-right {
    cursor: se-resize !important;
  }
  .react-flow__resize-control.handle-bottom.handle-left {
    cursor: sw-resize !important;
  }
  .react-flow__resize-control.handle-top.handle-right {
    cursor: ne-resize !important;
  }
  .react-flow__resize-control.handle-top.handle-left {
    cursor: nw-resize !important;
  }
  
  /* Fix for ReactFlow controls visibility on mobile */
  .react-flow__controls {
    position: fixed !important;
    bottom: 0px !important;
    left: 0px !important;
    z-index: 10 !important;
    background: rgba(255, 255, 255, 0.9) !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
  }
  
  /* Dark mode styling */
  .dark-mode .react-flow__node {
    color: #f8fafc;
  }
  .dark-mode .node-card {
    background-color: #1e293b;
    border-color: #334155;
  }
  .dark-mode .react-flow__background {
    background-color: #0f172a;
  }
  .dark-mode .react-flow__edge path {
    stroke: #64748b;
    stroke-opacity: 0.75;
    stroke-width: 1.5;
  }
  .dark-mode .react-flow__controls {
    background: rgba(30, 41, 59, 0.9) !important;
  }
  
  /* Prevent border style conflicts */
  .react-flow__node {
    border: none !important;
    border-color: transparent !important;
  }
`;

// Animation for PDF viewer opening from the right
export const pdfViewerAnimationStyles = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out forwards;
  }
`;

// Draggable elements styling moved from globals.css
export const draggableStyles = `
  /* Draggable elements */
  .react-draggable {
    user-select: none;
  }

  .react-draggable-dragging {
    z-index: 100 !important;
    cursor: grabbing !important;
  }

  .drag-handle {
    cursor: grab;
  }

  .no-drag {
    cursor: pointer;
  }
`;

// Colors for sticky notes based on column level
export const STICKY_NOTE_COLORS = [
  { bg: '#EBF8FF', border: '#3182CE', shadow: 'rgba(49, 130, 206, 0.2)' }, // Bright blue
  { bg: '#E6FFFA', border: '#319795', shadow: 'rgba(49, 151, 149, 0.2)' }, // Teal
  { bg: '#E9E3FF', border: '#6B46C1', shadow: 'rgba(107, 70, 193, 0.2)' }, // Purple
  { bg: '#EDFDFD', border: '#0987A0', shadow: 'rgba(9, 135, 160, 0.2)' },  // Cyan
  { bg: '#EBF4FF', border: '#4C51BF', shadow: 'rgba(76, 81, 191, 0.2)' },  // Indigo
  { bg: '#F0FFF4', border: '#38A169', shadow: 'rgba(56, 161, 105, 0.2)' }, // Green
  { bg: '#E6F7FF', border: '#0C74D6', shadow: 'rgba(12, 116, 214, 0.2)' }, // Vivid blue
];

// Special node colors
export const BLANK_NODE_COLOR = { bg: '#ffffff', border: '#000000', shadow: 'rgba(158, 158, 158, 0.4)' }; // White/plain
export const ANSWER_NODE_COLOR = { bg: '#F0F9FF', border: '#63B3ED', shadow: 'rgba(66, 153, 225, 0.15)' }; // Very light blue

// Sticky note CSS styles
export const stickyNoteStyles = `
  .sticky-note {
    position: relative;
    overflow: visible;
    border-radius: 8px;
  }
  
  .sticky-note-fold {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 0;
    height: 0;
    border: 0 solid transparent;
    border-bottom: 15px solid transparent;
    border-left: 15px solid transparent;
    opacity: 0.4;
    border-bottom-right-radius: 8px;
  }
  
  /* Fix for mobile browsers */
  .react-flow__handle {
    border: none !important;
  }
  
  /* Ensure reactflow handle styles have priority */
  .react-flow__handle.source,
  .react-flow__handle.target {
    border: none !important;
  }

  /* Markdown content styling */
  .markdown-content h1 {
    font-size: 1.2rem;
    font-weight: bold;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .markdown-content h2 {
    font-size: 1.1rem;
    font-weight: bold;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .markdown-content h3,
  .markdown-content h4,
  .markdown-content h5,
  .markdown-content h6 {
    font-size: 1rem;
    font-weight: bold;
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .markdown-content p {
    margin-bottom: 0.5rem;
  }

  .markdown-content ul,
  .markdown-content ol {
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
    padding-left: 1.5rem;
  }

  .markdown-content ul {
    list-style-type: disc;
  }

  .markdown-content ol {
    list-style-type: decimal;
  }

  .markdown-content li {
    margin-bottom: 0.125rem;
  }

  .markdown-content code {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  .markdown-content pre {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.5rem;
    border-radius: 5px;
    overflow-x: auto;
    margin: 0.5rem 0;
  }

  .markdown-content blockquote {
    border-left: 3px solid rgba(0, 0, 0, 0.2);
    padding-left: 0.75rem;
    margin: 0.5rem 0;
    font-style: italic;
    color: rgba(0, 0, 0, 0.7);
  }

  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }

  .markdown-content th,
  .markdown-content td {
    border: 1px solid rgba(0, 0, 0, 0.2);
    padding: 0.3rem;
    text-align: left;
  }

  .markdown-content th {
    background-color: rgba(0, 0, 0, 0.05);
  }

  /* For proper display of markdown in QnA nodes */
  .node-description-content .markdown-content {
    width: 100%;
    word-break: break-word;
  }
`;

// Node resize and animation styling
export const nodeAnimationStyles = `
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

// Follow-up card animation styles
export const followUpCardStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { 
      transform: scale(0.95);
      opacity: 0;
    }
    to { 
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// ReactFlow theme styles
export const reactFlowStyles = `
  /* Ensure ReactFlow node positioning */
  .react-flow__node {
    z-index: 10;
  }
  
  .react-flow__edge {
    z-index: 5;
  }

  /* Edge styling */
  .react-flow__edge path {
    stroke-linecap: round;
    transition: stroke 0.2s, stroke-width 0.2s, stroke-opacity 0.2s;
  }

  .react-flow__edge.selected path,
  .react-flow__edge:focus path,
  .react-flow__edge:hover path {
    stroke-opacity: 1;
    stroke-width: 2px;
  }

  /* Theme-aware background dots */
  .react-flow__background {
    background-color: var(--background);
  }
  
  .react-flow__background-dots {
    background-color: var(--muted);
  }

  /* Theme-aware controls */
  .react-flow__controls {
    background: var(--card);
    border: 1px solid var(--border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    overflow: hidden;
  }

  .react-flow__controls-button {
    background: var(--card);
    border-bottom: 1px solid var(--border);
    color: var(--foreground);
    transition: background 0.2s ease;
  }

  /* Round the first and last buttons */
  .react-flow__controls-button:first-child {
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }

  .react-flow__controls-button:last-child {
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    border-bottom: none;
  }

  .react-flow__controls-button:hover {
    background: var(--muted);
  }

  .react-flow__controls-button svg {
    fill: var(--foreground);
  }
`;

// Base node card styles
export const nodeCardBaseStyle = `
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12px;
  text-align: left;
  background-color: white;
  border: 2px solid transparent; // Start with transparent border
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 150px; // Ensure nodes have a minimum width
  position: relative; // Needed for absolute positioning of buttons
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.3s ease; // Added transitions
`;

// Styles for the updating state
export const nodeCardUpdatingStyle = `
  border-color: #4299e1; // Highlight border color
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5); // Highlight shadow
`;

// Combine base and updating styles (example of how it might be used, though className is simpler)
// export const getDynamicNodeStyle = (isUpdating: boolean) => `
//   ${nodeCardBaseStyle}
//   ${isUpdating ? nodeCardUpdatingStyle : ''}
// `;

// Add mobile-specific overscroll prevention
export const mobileOverscrollStyles = `
  @media (max-width: 768px) {
    html, body {
      overscroll-behavior: none;
      overscroll-behavior-y: none;
      position: fixed;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    
    .sticky {
      position: sticky !important;
      top: 0;
      z-index: 50;
    }
  }
`;

// Combine all styles for easy import
export const combinedStyles = `
  ${nodeUpdateStyles}
  ${pdfViewerAnimationStyles}
  ${draggableStyles}
  ${stickyNoteStyles}
  ${mobileOverscrollStyles}
  ${nodeAnimationStyles}
  ${followUpCardStyles}
  ${reactFlowStyles}
`; 