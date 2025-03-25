'use client';

import { useState, useEffect } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap, 
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { LoaderCircle } from 'lucide-react';

// Node types for ReactFlow
const nodeTypes = {
  custom: CustomNode,
};

// Pro options to remove attribution
const proOptions = { hideAttribution: true };

interface MindMapFlowProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onInit: (instance: any) => void;
  openPdfViewer?: (pageNumber: number) => void;
  loading?: boolean;
}

const MindMapFlow = ({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onInit,
  openPdfViewer,
  loading = false,
}: MindMapFlowProps) => {
  const reactFlow = useReactFlow();
  const [nodesDraggable, setNodesDraggable] = useState(true);

  // Enhance nodes with PDF viewer capability
  const enhancedNodes = nodes.map(node => {
    // Log the node data to check if pageNumber exists
    if (process.env.NODE_ENV === 'development') {
      console.log(`Node ${node.id}: pageNumber=${node.data.pageNumber}, hasOpenPdf=${!!openPdfViewer}`);
    }
    
    return {
      ...node,
      data: {
        ...node.data,
        openPdfViewer // Pass the openPdfViewer function to all nodes
      }
    };
  });

  // Detect when the data-nodedrag attribute is set to false
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'data-nodedrag') {
          const nodes = document.querySelectorAll('[data-nodedrag="false"]');
          setNodesDraggable(nodes.length === 0);
        }
      });
    });

    // Observe the entire react-flow container for attribute changes
    const reactFlowPane = document.querySelector('.react-flow');
    if (reactFlowPane) {
      observer.observe(reactFlowPane, { 
        attributes: true, 
        attributeFilter: ['data-nodedrag'],
        subtree: true // Observe all descendants
      });
    }

    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    if (reactFlow && nodes.length > 0) {
      // Center view with a slight delay to ensure nodes are properly rendered
      setTimeout(() => {
        reactFlow.fitView({ padding: 0.4, duration: 800 });
      }, 200);
    }
  }, [reactFlow]); // Only depend on reactFlow, not nodes.length

  const showLoadingIndicator = loading || nodes.length === 0;

  return (
    <div className="relative w-full h-full">
      {/* Keep only essential styles, portal handles the FollowUpCard positioning */}
      <style jsx global>{`
        /* Ensure ReactFlow node positioning */
        .react-flow__node {
          z-index: 10;
        }
        
        .react-flow__edge {
          z-index: 5;
        }
      `}</style>
      
      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={onInit}
        nodesDraggable={nodesDraggable} // Use the state to control whether nodes are draggable
        proOptions={proOptions}
        elementsSelectable={true}
        zoomOnScroll={true}
        minZoom={0.2} // Set the minimum zoom level (max zoom-out)
        maxZoom={4} // Set the maximum zoom level (max zoom-in)
        defaultEdgeOptions={{
          type: 'bezier',
          style: { stroke: '#3182CE', strokeWidth: 2, zIndex: 1000 },
          animated: false
        }}
        className={`mindmap-container`}
        style={{ width: '100%', height: '100%' }}
      >
        <Controls className="print:hidden" />
        <Background color='#f8fafc' gap={24} size={1} />
      </ReactFlow>
      
      {showLoadingIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default MindMapFlow; 