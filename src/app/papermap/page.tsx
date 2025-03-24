'use client';

import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import MindMapFlow from './components/MindMapFlow';
import PdfViewer from './components/PdfViewer';
import TopBar from './components/TopBar';
import { useMindMap } from './hooks/useMindMap';
import { combinedStyles } from './components/styles';
import { useState, useCallback } from 'react';

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
  // Store PDF data as base64 string instead of ArrayBuffer
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);

  // Helper function to get file base name without extension
  const getBaseName = (name: string) => {
    return name.replace(/\.[^/.]+$/, '');
  };

  // Custom file upload handler that extracts the file name and stores PDF data
  const handleUpload = useCallback(async (file: File) => {
    // Set the file name (without extension) for downloads
    setFileName(getBaseName(file.name));
    
    // Store the PDF data for viewing
    try {
      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Convert ArrayBuffer to base64 string for reliable storage
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(byte => binary += String.fromCharCode(byte));
      const base64 = btoa(binary);
      
      // Store base64 string instead of ArrayBuffer
      setPdfBase64(base64);
    } catch (error) {
      console.error("Failed to read PDF file:", error);
    }
    
    // Call the original upload handler
    handleFileUpload(file);
  }, [handleFileUpload]);
  
  // Function to open PDF viewer at a specific page
  const openPdfViewer = useCallback((pageNumber: number) => {
    setCurrentPdfPage(pageNumber);
    setIsPdfViewerOpen(true);
  }, []);
  
  // Function to close PDF viewer
  const closePdfViewer = useCallback(() => {
    setIsPdfViewerOpen(false);
  }, []);
  
  return (
    <div className={`flex flex-col h-screen`}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

      <TopBar
        loading={loading}
        error={error}
        nodes={nodes}
        mindMapData={mindMapData}
        reactFlowWrapper={reactFlowWrapper}
        reactFlowInstance={reactFlowInstance}
        fileName={fileName}
        onFileUpload={handleUpload}
      />
      
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
            openPdfViewer={openPdfViewer}
          />
        </ReactFlowProvider>
      </div>
      
      {/* PDF Viewer */}
      <PdfViewer
        pdfBase64={pdfBase64}
        isOpen={isPdfViewerOpen}
        onClose={closePdfViewer}
        initialPage={currentPdfPage}
      />
    </div>
  );
}
