// Diagram types and themes for Inztagram

export interface DiagramType {
  value: string;
  label: string;
}

export const DIAGRAM_TYPES: DiagramType[] = [
  { value: 'graph TD', label: 'Flowchart (Top-Down)' },
  { value: 'graph LR', label: 'Flowchart (Left-Right)' },
  { value: 'sequenceDiagram', label: 'Sequence Diagram' },
  { value: 'classDiagram', label: 'Class Diagram' },
  { value: 'stateDiagram-v2', label: 'State Diagram' },
  { value: 'erDiagram', label: 'ER Diagram' },
  { value: 'journey', label: 'User Journey' },
  { value: 'gantt', label: 'Gantt Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'requirementDiagram', label: 'Requirement Diagram' },
  { value: 'gitGraph', label: 'Gitgraph Diagram' },
  { value: 'mindmap', label: 'Mind Map' },
  { value: 'timeline', label: 'Timeline' },
];

export const DIAGRAM_THEMES: DiagramType[] = [
  { value: 'default', label: 'Default' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'base', label: 'Base' },
]; 