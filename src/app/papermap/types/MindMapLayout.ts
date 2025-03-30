import { Node, Edge } from 'reactflow';
import dagre from '@dagrejs/dagre';
import { MindMapData, COLUMN_WIDTH, NodePosition } from './MindMapTypes';

// Define layout options type
export type LayoutOptions = {
  direction: 'LR' | 'TB' | 'RL' | 'BT';
  ranker: 'network-simplex' | 'tight-tree' | 'longest-path';
  align: 'UL' | 'UR' | 'DL' | 'DR';
  name: string; // Display name for the layout
};

// Define available layout presets
export const LAYOUT_PRESETS: LayoutOptions[] = [
  {
    direction: 'LR',
    ranker: 'network-simplex',
    align: 'DL',
    name: 'Left to Right'
  },
  {
    direction: 'TB',
    ranker: 'network-simplex',
    align: 'DL',
    name: 'Top to Bottom'
  }
];

// Get default layout index based on screen size
export const getDefaultLayoutIndex = (): number => {
  // Check if window is defined (client-side) safely
  const isBrowser = typeof window !== 'undefined';
  
  // Only check window.innerWidth on the client
  if (isBrowser) {
    // Use Top to Bottom for mobile (index 1)
    if (window.innerWidth < 768) {
      return 1; // TB layout
    }
  }
  
  // Default to Left to Right for desktop (index 0) or server-side rendering
  return 0; // LR layout
};

// Default layout option is now determined by device type
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = LAYOUT_PRESETS[0]; // This is a fallback

// Modern edge colors for consistent connection styling
const EDGE_COLORS = [
  '#3182CE', // Bright blue
  '#319795', // Teal
  '#6B46C1', // Purple
  '#0987A0', // Cyan
  '#4C51BF', // Indigo
  '#38A169', // Green
  '#0C74D6', // Vivid blue
];

/**
 * Creates an optimized layout for the mind map using dagre layout algorithm
 * @param data MindMap data containing nodes and their relationships
 * @param updateNodeCallback Callback function to update node data
 * @param layoutOptions Options for the layout algorithm
 * @returns ReactFlow nodes and edges
 */
export const createMindMapLayout = (
  data: MindMapData, 
  updateNodeCallback: (nodeId: string, newData: {title?: string; description?: string; width?: number}) => void,
  layoutOptions: LayoutOptions = DEFAULT_LAYOUT_OPTIONS
): { nodes: Node[]; edges: Edge[] } => {
  // Initialize dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  
  // Set default edge label function
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 256; // Default node width
  const nodeHeight = 150; // Increased node height for better spacing

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
  
  // Calculate node levels (column number) - Do this BEFORE setting up dagre
  const nodeLevels: Record<string, number> = {};
  
  // First, get root nodes (nodes without parents)
  const rootNodes = data.nodes.filter(node => !node.parentId).map(node => node.id);
  
  // Set root nodes to level 0
  rootNodes.forEach(nodeId => {
    nodeLevels[nodeId] = 0;
  });
  
  // Traverse graph to set level for each node
  const assignLevels = (nodeId: string, level: number) => {
    nodeLevels[nodeId] = level;
    
    // Assign level + 1 to all children
    const children = parentToChildren[nodeId] || [];
    children.forEach(childId => {
      assignLevels(childId, level + 1);
    });
  };
  
  // Start level assignment from all root nodes
  rootNodes.forEach(nodeId => {
    assignLevels(nodeId, 0);
  });
  
  // Set graph direction and options based on provided layoutOptions
  dagreGraph.setGraph({ 
    rankdir: layoutOptions.direction,
    nodesep: 100, // Increased vertical spacing between nodes in the same rank
    ranksep: COLUMN_WIDTH, // Horizontal spacing between ranks/levels
    align: layoutOptions.align, // Alignment based on layout options
    ranker: layoutOptions.ranker, // Ranker algorithm based on layout options
    marginx: 50, // Add margin on the left and right
    marginy: 50  // Add margin on the top and bottom
  });
  
  // Add nodes to dagre graph with hierarchy constraints
  data.nodes.forEach(node => {
    // Adjust node height based on title and description length
    let adjustedHeight = nodeHeight;
    
    // Add more height for longer descriptions
    if (node.description && node.description.length > 200) {
      adjustedHeight += 50;
    } else if (node.description && node.description.length > 100) {
      adjustedHeight += 25;
    }
    
    // Get node level (will be used for rank constraint)
    const level = nodeLevels[node.id] || 0;
    
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: adjustedHeight,
      label: node.title, // Set label for debugging
      rank: level // Explicitly set rank based on hierarchy level
    });
  });
  
  // Add edges to dagre graph
  data.nodes.forEach(node => {
    if (node.parentId) {
      dagreGraph.setEdge(node.parentId, node.id);
    }
  });
  
  // Run the layout algorithm
  try {
    console.log('Running dagre layout with', data.nodes.length, 'nodes');
    dagre.layout(dagreGraph);
    console.log('Dagre layout completed');
  } catch (error) {
    console.error('Error in dagre layout:', error);
  }
  
  // Map nodes with positions from dagre
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Use dagre positions for all nodes
  let allNodesPositioned = true;
  
  // Process nodes in order of their levels to ensure proper positioning
  // Sort nodes by level for reliable processing order
  const nodesByLevel: Record<number, string[]> = {};
  Object.entries(nodeLevels).forEach(([nodeId, level]) => {
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(nodeId);
  });
  
  // Process nodes level by level
  const maxLevel = Math.max(...Object.keys(nodesByLevel).map(Number));
  for (let level = 0; level <= maxLevel; level++) {
    const nodesAtLevel = nodesByLevel[level] || [];
    
    // Process nodes at this level
    nodesAtLevel.forEach(nodeId => {
      const node = data.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const nodeWithPosition = dagreGraph.node(nodeId);
      
      // Check if dagre properly positioned this node
      if (!nodeWithPosition || typeof nodeWithPosition.x !== 'number' || typeof nodeWithPosition.y !== 'number') {
        console.warn(`Dagre failed to position node ${nodeId}`);
        allNodesPositioned = false;
        return;
      }
      
      // Determine if this is a QnA node
      const isQnANode = node.type === 'qna';
      
      // Check if this node has children
      const hasChildren = !!parentToChildren[nodeId]?.length;
      
      // Get node level (column number)
      const columnLevel = nodeLevels[nodeId] || 0;
      
      // Use the level for consistent positioning
      // Create ReactFlow node with position from dagre
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { 
          x: nodeWithPosition.x - nodeWidth / 2, 
          y: nodeWithPosition.y - nodeWithPosition.height / 2
        },
        data: { 
          title: node.title,
          description: node.description,
          updateNodeData: updateNodeCallback,
          nodeType: node.type, // Pass the node type
          expanded: isQnANode, // Set expanded to true for QnA nodes
          hasChildren: hasChildren, // Pass if this node has children
          width: nodeWidth, // Default width for nodes
          pageNumber: node.pageNumber, // Pass the page number from the API response
          columnLevel: columnLevel, // Add column level for coloring
          layoutDirection: layoutOptions.direction // Pass the layout direction to the node data
        },
        // Only set zIndex to ensure proper layering
        style: {
          zIndex: 100,
        },
        className: 'node-card'
      });
    });
  }
  
  // If not all nodes were positioned, log error but continue with what we have
  if (!allNodesPositioned) {
    console.error('Some nodes could not be positioned by dagre');
  }
  
  // Create edges in a separate loop to ensure all nodes exist
  data.nodes.forEach(node => {
    if (node.parentId) {
      // Get the parent node's column level for color coordination
      const parentLevel = nodeLevels[node.parentId] || 0;
      const parentColorIndex = parentLevel % EDGE_COLORS.length;
      const edgeColor = EDGE_COLORS[parentColorIndex];
      
      // Create a smooth bezier curve with simplified styling
      edges.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        sourceHandle: 'source',
        targetHandle: 'target',
        type: 'bezier',
        style: { 
          stroke: edgeColor, 
          strokeWidth: 1.5, 
          strokeOpacity: 0.7,
          zIndex: 50
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