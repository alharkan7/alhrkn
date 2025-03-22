'use client';

import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import Uploader from './components/Uploader';
import DownloadOptions from './components/DownloadOptions';
import { LoadingIcon } from './components/Icons';
import MindMapFlow from './components/MindMapFlow';
import { useMindMap } from './hooks/useMindMap';
import { nodeUpdateStyles } from './components/styles';

export default function PaperMap() {
  const {
    loading,
    error,
    mindMapData,
    nodes,
    edges,
    nodePositions,
    reactFlowWrapper,
    reactFlowInstance,
    onNodesChange,
    onEdgesChange,
    handleFileUpload,
    handleResetView
  } = useMindMap();
  
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
