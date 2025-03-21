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

  // CSS for node update animation
  const nodeUpdateStyles = `
    @keyframes node-updated {
      0% { border-color: #4299e1; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5); }
      100% { border-color: #e2e8f0; box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1); }
    }
    .node-card {
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
              borderColor: '#4299e1', // Add a highlight to the border
              boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)',
              transition: 'all 0.3s ease',
            }
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
            return {
              ...node,
              style: {
                ...node.style,
                borderColor: '#e2e8f0',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.5s ease'
              }
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

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
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
      
      console.log('Setting nodes:', flowNodes.length);
      console.log('Setting edges:', flowEdges.length);
      
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to analyze the paper');
    } finally {
      setLoading(false);
    }
  };

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
