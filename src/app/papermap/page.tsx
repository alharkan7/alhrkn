'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import Uploader from './components/Uploader';
import DownloadOptions from './components/DownloadOptions';
import { MindMapData, NodePosition } from './components/MindMapTypes';
import { LoadingIcon } from './components/Icons';
import { createMindMapLayout, updateMindMapLayout } from './components/MindMapLayout';
import CustomNode from './components/CustomNode';

// Node types for ReactFlow
const nodeTypes = {
  custom: CustomNode,
};

// Create a separate Flow component to use the useReactFlow hook
const MindMapFlow = ({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onInit,
}: { 
  nodes: Node[]; 
  edges: Edge[]; 
  onNodesChange: any; 
  onEdgesChange: any; 
  onInit: (instance: any) => void;
}) => {
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (reactFlow && nodes.length > 0) {
      // Center view with a slight delay to ensure nodes are properly rendered
      setTimeout(() => {
        reactFlow.fitView({ padding: 0.4, duration: 800 });
      }, 200);
    }
  }, [reactFlow, nodes.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onInit={onInit}
      fitView
      attributionPosition="bottom-right"
      elementsSelectable={true}
      zoomOnScroll={true}
      defaultEdgeOptions={{
        type: 'bezier',
        style: { stroke: '#3182CE', strokeWidth: 2, zIndex: 1000 },
        animated: false
      }}
      className={`mindmap-container`}
      style={{ width: '100%', height: '100%' }}
    >
      <Controls className="print:hidden" />
      <MiniMap className="print:hidden" />
      <Background color='#f8fafc' gap={24} size={1} />
    </ReactFlow>
  );
};

export default function PaperMap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<any>(null);
  
  // Create a ref to hold the latest addFollowUpNode implementation
  const addFollowUpNodeRef = useRef<(parentId: string, question: string, answer: string, customNodeId?: string) => string>((parentId, question, answer, customNodeId) => {
    console.error("addFollowUpNode called before initialization");
    return customNodeId || '';
  });

  // CSS for node update animation
  const nodeUpdateStyles = `
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

  // Update node data
  const updateNodeData = useCallback((nodeId: string, newData: {title?: string; description?: string}) => {
    // Apply visual feedback for the edited node (like a subtle highlight)
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId) {
          // Add a subtle animation/highlight to the node that was just edited
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
              updateNodeData // Keep the update function in the data
            },
            style: {
              ...node.style,
              borderColor: node.data.nodeType === 'qna' ? '#bfdbfe' : '#4299e1', // Keep QnA styling if it's a QnA node
              boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)',
            },
            className: 'node-card updating' // Add updating class for transition effect
          };
        }
        return node;
      })
    );
    
    // After a short delay, reset the style
    setTimeout(() => {
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === nodeId) {
            const isQnA = node.data.nodeType === 'qna';
            return {
              ...node,
              style: {
                ...node.style,
                borderColor: isQnA ? '#bfdbfe' : '#e2e8f0', // Keep QnA styling
                backgroundColor: isQnA ? '#eff6ff' : '#ffffff', // Keep QnA background
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              className: 'node-card' // Remove updating class to prevent transitions during drag
            };
          }
          return node;
        })
      );
    }, 1000);
    
    // Also update the mindMapData
    if (mindMapData) {
      setMindMapData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: prev.nodes.map((n) => {
            if (n.id === nodeId) {
              return {
                ...n,
                title: newData.title ?? n.title,
                description: newData.description ?? n.description
              };
            }
            return n;
          })
        };
      });
    }
  }, [mindMapData, setNodes]);

  // Add a new follow-up node
  const addFollowUpNode = (parentId: string, question: string, answer: string, customNodeId?: string): string => {
    console.log('DIRECT addFollowUpNode called with mindMapData:', mindMapData ? 'exists' : 'null');
    
    // Generate a unique ID for the new node or use the provided ID
    const newNodeId = customNodeId || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find the parent node to determine the level
    if (!mindMapData) {
      console.error("Cannot add follow-up node: mindMapData is null");
      return newNodeId;
    }
    
    const parentNode = mindMapData.nodes.find(node => node.id === parentId);
    if (!parentNode) {
      console.error(`Cannot add follow-up node: parent node with id ${parentId} not found`);
      return newNodeId;
    }

    console.log('Adding follow-up node:', { parentId, question, answer: answer.substring(0, 50) + '...', nodeId: newNodeId });
    
    // Find the parent node in ReactFlow nodes
    const parentFlowNode = nodes.find(node => node.id === parentId);
    if (!parentFlowNode) {
      console.error(`Cannot add follow-up node: parent ReactFlow node with id ${parentId} not found`);
      return newNodeId;
    }
    
    // Create the new node with question as title and answer as description
    const newNode = {
      id: newNodeId,
      title: question,
      description: answer,
      parentId: parentId,
      level: parentNode.level + 1,
      type: 'qna' as 'regular' | 'qna' // Mark as a QnA node
    };
    
    // Update mindMapData with the new node
    setMindMapData(prevData => {
      if (!prevData) return null;
      const updatedData = {
        ...prevData,
        nodes: [...prevData.nodes, newNode]
      };
      console.log('Updated mindMapData, node count:', updatedData.nodes.length);
      return updatedData;
    });
    
    // Get parent node position
    const parentPos = parentFlowNode.position;
    
    // Calculate position for the new node
    // Find how many siblings this node has to calculate vertical offset
    const siblings = mindMapData.nodes.filter(n => n.parentId === parentId);
    
    // Calculate appropriate vertical offset
    let verticalOffset = 0;
    
    if (siblings.length === 0) {
      // First child should be aligned with parent
      verticalOffset = 0;
    } else {
      // Place below existing siblings
      verticalOffset = siblings.length * 160; // NODE_VERTICAL_SPACING
    }
    
    const newNodePosition = { 
      x: parentPos.x + 550, // COLUMN_WIDTH
      y: parentPos.y + verticalOffset
    };
    
    console.log('New node position:', {
      newNodePosition,
      parentPos,
      siblingCount: siblings.length,
      verticalOffset
    });
    
    // Store the ID of the last created node in all nodes' data for reference in async operations
    const lastCreatedNodeId = newNodeId;
    
    // Create ReactFlow node
    const newFlowNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: newNodePosition,
      data: { 
        title: question,
        description: answer,
        updateNodeData,
        addFollowUpNode,
        nodeType: 'qna', // Set the nodeType for QnA nodes
        expanded: true, // Set expanded to true for QnA nodes
        lastCreatedNodeId // Store reference to this node ID for updates
      },
      style: {
        border: '2px solid #4299e1', // Highlight the new node
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)',
        zIndex: 1000, // Ensure it's on top
      },
      className: 'node-card updating'
    };
    
    // Create edge from parent to new node
    const newEdge: Edge = {
      id: `e-${parentId}-${newNodeId}`,
      source: parentId,
      target: newNodeId,
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
    };
    
    // Update nodes and edges - use functional updates to ensure latest state
    setNodes(currentNodes => {
      const updatedNodes = [...currentNodes, newFlowNode];
      console.log('Updated nodes array:', updatedNodes.length, 'nodes');
      return updatedNodes;
    });
    
    setEdges(currentEdges => {
      const updatedEdges = [...currentEdges, newEdge];
      console.log('Updated edges array:', updatedEdges.length, 'edges');
      return updatedEdges;
    });
    
    // Update all nodes to have reference to the last created node ID
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          lastCreatedNodeId
        }
      }))
    );
    
    // Reset the highlight after a moment
    setTimeout(() => {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          if (node.id === newNodeId) {
            return {
              ...node,
              style: {
                ...node.style,
                border: '2px solid #bfdbfe', // QnA node border color
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              className: 'node-card'
            };
          }
          return node;
        })
      );
    }, 2000);
    
    // Fit view after a longer delay to ensure the new node is properly rendered
    setTimeout(() => {
      if (reactFlowInstance.current) {
        console.log('Fitting view to include new node');
        reactFlowInstance.current.fitView({ 
          padding: 0.4, 
          duration: 800,
          includeHiddenNodes: false,
        });
      }
    }, 500);
    
    // Return the node ID for reference
    return newNodeId;
  };
  
  // Always update the reference
  useEffect(() => {
    // Update the ref with the latest implementation that has access to current state
    addFollowUpNodeRef.current = addFollowUpNode;
  });
  
  // Create a stable function that always calls the latest implementation
  const stableAddFollowUpNode = useCallback((parentId: string, question: string, answer: string, customNodeId?: string) => {
    console.log('Stable addFollowUpNode called, delegating to current implementation');
    // Always call the latest implementation from the ref
    const nodeId = addFollowUpNodeRef.current(parentId, question, answer, customNodeId);
    return nodeId || customNodeId || ''; // Ensure we always return a string
  }, []);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Store the PDF data in localStorage for future API calls
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        if (typeof base64data === 'string') {
          const base64Content = base64data.split(',')[1];
          localStorage.setItem('pdfData', base64Content);
          console.log('PDF data stored in localStorage, size:', base64Content.length);
        }
      };
      reader.readAsDataURL(file);
      
      const response = await fetch('/api/papermap', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process the paper');
      }
      
      const data = await response.json();
      setMindMapData(data);
      
      console.log('API Response:', data);
      
      // Convert MindMap data to ReactFlow elements
      const { nodes: flowNodes, edges: flowEdges } = createMindMapLayout(data, updateNodeData);
      
      // Add the addFollowUpNode function to all nodes' data
      const nodesWithFollowUp = flowNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          addFollowUpNode: stableAddFollowUpNode // Use the stable function
        }
      }));
      
      console.log('Setting nodes:', nodesWithFollowUp.length);
      console.log('Setting edges:', flowEdges.length);
      
      setNodes(nodesWithFollowUp);
      setEdges(flowEdges);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to analyze the paper');
    } finally {
      setLoading(false);
    }
  };

  // Force update node handlers when mindMapData changes
  useEffect(() => {
    if (mindMapData && nodes.length > 0) {
      console.log('Updating addFollowUpNode references due to mindMapData change');
      
      // Update all nodes with the current addFollowUpNode function
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            addFollowUpNode: stableAddFollowUpNode // Use the stable function
          }
        }))
      );
    }
  }, [mindMapData, stableAddFollowUpNode]);
  
  // For debugging
  useEffect(() => {
    if (mindMapData) {
      console.log('mindMapData is available, nodes:', mindMapData.nodes.length);
    }
  }, [mindMapData]);

  // Reset zoom and center the view
  const handleResetView = useCallback(() => {
    // Only fit view to current node positions, don't recreate or reposition nodes
    if (reactFlowInstance.current) {
      // Use consistent padding settings for predictable view
      reactFlowInstance.current.fitView({ 
        padding: 0.4,
        includeHiddenNodes: false,
        duration: 800
      });
      
      // Update node positions for download component based on current positions
      if (mindMapData) {
        const currentNodes = reactFlowInstance.current.getNodes();
        const positions: Record<string, NodePosition> = {};
        currentNodes.forEach((node: { id: string; position: NodePosition }) => {
          positions[node.id] = node.position;
        });
        setNodePositions(positions);
        
        // Apply the updated positions to the nodes
        const updatedNodes = updateMindMapLayout(nodes, positions);
        setNodes(updatedNodes);
      }
    }
  }, [mindMapData, nodes, setNodes]);

  return (
    <div className={`flex flex-col h-screen`}>
      <style dangerouslySetInnerHTML={{ __html: nodeUpdateStyles }} />
      <div className={`p-4 bg-gray-50 border-b print:hidden`}>
        <div className="flex items-center gap-4">
          <Uploader 
            onFileUpload={handleFileUpload} 
            loading={loading}
            error={error}
          />
          {loading && (
            <div className="flex items-center text-blue-600">
              <LoadingIcon className="animate-spin mr-2" />
              <span>Analyzing paper...</span>
            </div>
          )}
          {error && (
            <div className="text-red-500">
              {error}
            </div>
          )}
          {mindMapData && (
            <DownloadOptions
              data={mindMapData}
              containerRef={reactFlowWrapper}
              onResetZoom={handleResetView}
              nodePositions={nodePositions}
              fileName={mindMapData?.nodes[0]?.title || "papermap"}
            />
          )}
        </div>
      </div>
      
      <div className="flex-grow" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <MindMapFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={(instance) => {
              reactFlowInstance.current = instance;
            }}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
