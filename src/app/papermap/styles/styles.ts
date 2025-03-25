export const nodeUpdateStyles = `
  @keyframes node-updated {
    0% { border: 2px solid #4299e1; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5); }
    100% { border: 2px solid #e2e8f0; box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1); }
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
    border: 2px solid #3182CE !important;
    box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.5) !important;
  }
  
  /* Resizer styling */
  .react-flow__resize-control {
    z-index: 100 !important;
  }
  .react-flow__resize-control.handle {
    background-color: #3b82f6 !important;
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

// Combined styles for use in the page component
export const combinedStyles = `
  ${nodeUpdateStyles}
  ${pdfViewerAnimationStyles}
  ${draggableStyles}
`; 