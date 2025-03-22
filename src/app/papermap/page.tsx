'use client';

import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import Uploader from './components/Uploader';
import { LoadingIcon } from './components/Icons';
import MindMapFlow from './components/MindMapFlow';
import Downloader from './components/Downloader';
import { useMindMap } from './hooks/useMindMap';
import { nodeUpdateStyles } from './components/styles';
import { useState } from 'react';

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

  const [fileName, setFileName] = useState<string>('mindmap');

  // Helper function to get file base name without extension
  const getBaseName = (name: string) => {
    return name.replace(/\.[^/.]+$/, '');
  };

  // Custom file upload handler that extracts the file name
  const handleUpload = (file: File) => {
    // Set the file name (without extension) for downloads
    setFileName(getBaseName(file.name));
    // Call the original upload handler
    handleFileUpload(file);
  };
  
  return (
    <div className={`flex flex-col h-screen`}>
      <style dangerouslySetInnerHTML={{ __html: nodeUpdateStyles }} />
      <div className={`p-4 bg-gray-50 border-b print:hidden`}>
        <div className="flex items-center gap-4">
          <Uploader 
            onFileUpload={handleUpload}
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
          
          {/* Download button component */}
          <Downloader
            nodes={nodes}
            mindMapData={mindMapData}
            reactFlowWrapper={reactFlowWrapper}
            reactFlowInstance={reactFlowInstance}
            fileName={fileName}
          />
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
