import { Node, Edge } from 'reactflow';
import { MindMapData, MindMapNode, COLUMN_WIDTH, NODE_VERTICAL_SPACING, NodePosition } from './MindMapTypes';

/**
 * Creates an optimized layout for the mind map using tree layout algorithm
 * @param data MindMap data containing nodes and their relationships
 * @param updateNodeCallback Callback function to update node data
 * @returns ReactFlow nodes and edges
 */
export const createMindMapLayout = (
  data: MindMapData, 
  updateNodeCallback: (nodeId: string, newData: {title?: string; description?: string}) => void
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Maps to store nodes by level and their calculated sizes
  const levelNodes: { [key: number]: MindMapNode[] } = {};
  
  // First, group nodes by their level
  data.nodes.forEach(node => {
    if (!levelNodes[node.level]) {
      levelNodes[node.level] = [];
    }
    levelNodes[node.level].push(node);
  });
  
  // Calculate y coordinates for each level
  const yPositions: { [key: string]: number } = {};
  
  // Process each level from 0 to max level
  Object.keys(levelNodes).sort((a, b) => Number(a) - Number(b)).forEach(levelStr => {
    const level = Number(levelStr);
    const nodesInLevel = levelNodes[level];
    
    // Process each node in the current level
    nodesInLevel.forEach((node, index) => {
      // If it's the root node (level 0), place it at the center
      if (level === 0) {
        yPositions[node.id] = 0;
      } else {
        // For non-root nodes, calculate position based on parent and siblings
        // Get parent node's position
        const parentY = yPositions[node.parentId || ''] || 0;
        
        // Count how many siblings this node has with the same parent
        const siblings = nodesInLevel.filter(n => n.parentId === node.parentId);
        const siblingIndex = siblings.findIndex(n => n.id === node.id);
        
        // Calculate position - place the node below its parent, adjusted for siblings
        const offset = siblingIndex - (siblings.length - 1) / 2;
        yPositions[node.id] = parentY + (offset * NODE_VERTICAL_SPACING);
      }
      
      // Create ReactFlow node
      nodes.push({
        id: node.id,
        type: 'custom',
        position: { 
          x: level * COLUMN_WIDTH, 
          y: yPositions[node.id]
        },
        data: { 
          title: node.title,
          description: node.description,
          updateNodeData: updateNodeCallback
        },
        style: {
          border: '2px solid #e2e8f0',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          transition: 'all 0.2s ease'
        },
        className: 'node-card'
      });
    });
  });
  
  // Create edges in a separate loop to ensure all nodes exist
  data.nodes.forEach(node => {
    if (node.parentId) {
      edges.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        sourceHandle: 'source',
        targetHandle: 'target',
        type: 'bezier',
        style: { 
          stroke: '#3182CE', 
          strokeWidth: 2, 
          strokeOpacity: 1, 
          zIndex: 1000 
        },
        animated: false,
        className: 'mindmap-edge'
      });
    }
  });
  
  return { nodes, edges };
};

/**
 * Updates the layout of the mind map when nodes are moved
 * @param nodes Current ReactFlow nodes
 * @param nodePositions Current node positions (if available)
 * @returns Updated nodes with positions
 */
export const updateMindMapLayout = (
  nodes: Node[], 
  nodePositions?: Record<string, NodePosition>
): Node[] => {
  // If node positions are provided, update nodes with those positions
  if (nodePositions && Object.keys(nodePositions).length > 0) {
    return nodes.map(node => {
      if (nodePositions[node.id]) {
        return {
          ...node,
          position: nodePositions[node.id]
        };
      }
      return node;
    });
  }
  
  return nodes;
};

/**
 * Exports the mind map data with current positions
 * @param data Original MindMap data
 * @param nodePositions Current node positions
 * @returns MindMap data with updated node positions
 */
export const exportMindMapWithPositions = (
  data: MindMapData,
  nodePositions: Record<string, NodePosition>
): MindMapData => {
  // Create a new copy of the data with updated positions
  return {
    ...data,
    nodes: data.nodes.map(node => {
      const position = nodePositions[node.id];
      return {
        ...node,
        // If we want to store positions in the MindMapNode type, we'd need to extend it
        // But we keep positions separate for now
      };
    })
  };
}; 