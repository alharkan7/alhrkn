'use client';

import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';

import MindMapFlow from './components/MindMapFlow';
import PdfViewer from './components/PdfViewer';
import TopBar from './components/TopBar';
import { useMindMap } from './hooks/useMindMap';
import { combinedStyles } from './styles';
import { MindMapProvider, PdfViewerProvider, UIStateProvider } from './context';

export default function PaperMap() {
  const { setTheme } = useTheme();

  // Force light theme on mount
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  // Get all the mindmap related state and functions from the hook
  const {
    loading,
    error,
    mindMapData,
    nodes,
    edges,
    reactFlowWrapper,
    reactFlowInstance,
    onNodesChange,
    onEdgesChange,
    handleFileUpload,
    handleResetView,
    loadExampleMindMap,
    pdfUrl,
    currentLayoutIndex,
    cycleLayout
  } = useMindMap();

  // Prepare context values
  const mindMapContextValue = {
    loading,
    error,
    mindMapData,
    nodes,
    edges,
    reactFlowWrapper,
    reactFlowInstance,
    onNodesChange,
    onEdgesChange,
    handleFileUpload,
    handleResetView,
    loadExampleMindMap,
    currentLayoutIndex,
    cycleLayout
  };

  return (
    <UIStateProvider initialLoading={loading} initialError={error}>
      <MindMapProvider value={mindMapContextValue}>
        <PdfViewerProvider initialPdfUrl={pdfUrl} initialFileName={'mindmap'}>
          <div className="flex flex-col h-screen">
            <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

            <TopBar 
              onFileUpload={handleFileUpload}
            />
            
            <div className="flex-grow" ref={reactFlowWrapper}>
              <ReactFlowProvider>
                <MindMapFlow />
              </ReactFlowProvider>
            </div>
            
            {/* PDF Viewer */}
            <PdfViewer />
          </div>
        </PdfViewerProvider>
      </MindMapProvider>
    </UIStateProvider>
  );
}
