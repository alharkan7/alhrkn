import { Node, Edge } from 'reactflow';
import dagre from '@dagrejs/dagre';
import { MindMapData, MindMapNode, COLUMN_WIDTH, NODE_VERTICAL_SPACING, NodePosition } from './MindMapTypes';

/**
 * Creates an optimized layout for the mind map using dagre layout algorithm
 * @param data MindMap data containing nodes and their relationships
 * @param updateNodeCallback Callback function to update node data
 * @returns ReactFlow nodes and edges
 */
export const createMindMapLayout = (
  data: MindMapData, 
  updateNodeCallback: (nodeId: string, newData: {title?: string; description?: string; width?: number}) => void
): { nodes: Node[]; edges: Edge[] } => {
  // Initialize dagre graph
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  const nodeWidth = 256; // Default node width
  const nodeHeight = 100; // Approximate node height

  // Set graph direction (LR = left to right)
  dagreGraph.setGraph({ 
    rankdir: 'LR',
    nodesep: 80, // Vertical spacing between nodes in the same rank
    ranksep: COLUMN_WIDTH, // Horizontal spacing between ranks/levels
    align: 'UL', // Align nodes by their upper-left corners
    ranker: 'network-simplex' // Use network simplex algorithm for layout
  });

  // Create a map of parent to children IDs for checking if nodes have children
  const parentToChildren: Record<string, string[]> = {};
  data.nodes.forEach(node => {
    if (node.parentId) {
      if (!parentToChildren[node.parentId]) {
        parentToChildren[node.parentId] = [];
      }
      parentToChildren[node.parentId].push(node.id);
    }
  });
  
  // Add nodes to dagre graph
  data.nodes.forEach(node => {
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight 
    });
  });
  
  // Add edges to dagre graph
  data.nodes.forEach(node => {
    if (node.parentId) {
      dagreGraph.setEdge(node.parentId, node.id);
    }
  });
  
  // Run the layout algorithm
  dagre.layout(dagreGraph);
  
  // Map nodes with positions from dagre
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  data.nodes.forEach(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Determine if this is a QnA node
    const isQnANode = node.type === 'qna';
    
    // Check if this node has children
    const hasChildren = !!parentToChildren[node.id]?.length;
    
    // Create ReactFlow node with position from dagre
    nodes.push({
      id: node.id,
      type: 'custom',
      position: { 
        x: nodeWithPosition.x - nodeWidth / 2, 
        y: nodeWithPosition.y - nodeHeight / 2
      },
      data: { 
        title: node.title,
        description: node.description,
        updateNodeData: updateNodeCallback,
        nodeType: node.type, // Pass the node type
        expanded: isQnANode, // Set expanded to true for QnA nodes
        hasChildren: hasChildren, // Pass if this node has children
        width: nodeWidth // Default width for nodes
      },
      style: {
        border: isQnANode ? '2px solid #bfdbfe' : '2px solid #e2e8f0',
        backgroundColor: isQnANode ? '#eff6ff' : '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
      },
      className: 'node-card'
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