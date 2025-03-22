// Constants for layout calculation
export const COLUMN_WIDTH = 550; // The horizontal spacing between node columns
export const NODE_VERTICAL_SPACING = 160; // The vertical spacing between nodes

// Node position type
export interface NodePosition {
  x: number;
  y: number;
}

// Mind map node type
export interface MindMapNode {
  id: string;
  title: string;
  description: string;
  parentId: string | null;
  level: number;
  type?: 'regular' | 'qna'; // Optional type for QnA nodes
  visible?: boolean; // Whether the node is visible (used for collapsed children)
  width?: number; // Optional width of the node
}

// Mind map data type
export interface MindMapData {
  nodes: MindMapNode[];
}

// Types for managing collapsed node state
export interface CollapsedNodesState {
  collapsedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
}

// Sample data for testing
export const sampleData: MindMapData = {
  nodes: [
    { id: 'node1', title: 'Paper Title', description: 'This is the main topic of the research paper.', parentId: null, level: 0 },
    { id: 'node2', title: 'Introduction', description: 'Provides background and context for the research.', parentId: 'node1', level: 1 },
    { id: 'node3', title: 'Literature Review', description: 'Give an overview of the literature on the topic, relevant theories to the research question.', parentId: 'node1', level: 1 },
    { id: 'node4', title: 'Methods', description: 'Details the approach used in the research.', parentId: 'node1', level: 1 },
    { id: 'node5', title: 'Results', description: 'Presents the findings of the research.', parentId: 'node1', level: 1 },
    { id: 'node6', title: 'Key Finding 1', description: 'The first major discovery from the research.', parentId: 'node5', level: 2 },
    { id: 'node7', title: 'Key Finding 2', description: 'The second major discovery from the research.', parentId: 'node5', level: 2 },
    { id: 'node8', title: 'Key Finding 3', description: 'The third major discovery from the research.', parentId: 'node5', level: 2 },
    { id: 'node9', title: 'Conclusion', description: 'Summarize the research and propose an answer to the research question', parentId: 'node1', level: 1 },
  ]
}; 