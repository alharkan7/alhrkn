import { MindMapNode, NodePosition } from './NodeCard';

// Interface for MindMapData
export interface MindMapData {
  nodes: MindMapNode[];
}

// Constants for layout
export const COLUMN_WIDTH = 400;
export const NODE_VERTICAL_SPACING = 200;

// Sample data for testing
export const sampleData: MindMapData = {
  nodes: [
    { id: 'node1', title: 'Paper Title', description: 'This is the main topic of the research paper.', parentId: null, level: 0 },
    { id: 'node2', title: 'Introduction', description: 'Provides background and context for the research.', parentId: 'node1', level: 1 },
    { id: 'node3', title: 'Methods', description: 'Details the approach used in the research.', parentId: 'node1', level: 1 },
    { id: 'node4', title: 'Results', description: 'Presents the findings of the research.', parentId: 'node1', level: 1 },
    { id: 'node5', title: 'Key Finding 1', description: 'The first major discovery from the research.', parentId: 'node4', level: 2 },
  ]
}; 