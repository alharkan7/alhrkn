// Constants for layout calculation
export const COLUMN_WIDTH = 300; // The horizontal spacing between node columns
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
  pageNumber?: number; // Page number in the PDF
  type?: 'regular' | 'qna' | 'blank'; // Type of node (regular, Q&A, or blank)
  children?: MindMapNode[]; // For hierarchical structure visualization
  visible?: boolean; // Whether the node is visible (used for collapsed children)
  width?: number; // Optional width of the node
  expanded?: boolean; // Whether the node is expanded (description visible)
  __contentOnlyUpdate?: boolean; // Flag to indicate this is just a content update
}

// Mind map data type
export interface MindMapData {
  nodes: MindMapNode[];
  __contentOnlyUpdate?: boolean; // Flag to indicate this is just a content update, not a structural change
  __nodeAddition?: boolean; // Flag to indicate this is a node addition operation
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