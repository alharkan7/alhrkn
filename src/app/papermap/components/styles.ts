export const nodeUpdateStyles = `
  @keyframes node-updated {
    0% { border-color: #4299e1; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5); }
    100% { border-color: #e2e8f0; box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1); }
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
    border-color: #3182CE !important;
    box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.5) !important;
  }
  
  /* Resizer styling */
  .react-flow__resize-control {
    z-index: 100 !important;
  }
  .react-flow__resize-control.handle {
    background-color: #3b82f6 !important;
    border: 1px solid white !important;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5) !important;
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
`; 