'use client';

import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { useEffect, useState, useCallback, DragEvent } from 'react';
import { useTheme } from 'next-themes';
import { FileUp, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

import MindMapFlow from './components/MindMapFlow';
import PdfViewer from './components/PdfViewer';
import TopBar from './components/TopBar';
import { useMindMap } from './hooks/useMindMap';
import { combinedStyles } from './styles';
import { MindMapProvider, PdfViewerProvider, UIStateProvider } from './context';

// Define file size limits (copied from Sidebar.tsx)
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PaperMap() {
  const { setTheme } = useTheme();

  // Force light theme on mount
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  // Add cleanup on page unload/refresh
  useEffect(() => {
    // Function to clean up session when page is closed/refreshed
    const cleanupSession = async () => {
      try {
        const sessionId = localStorage.getItem('currentSessionId');
        if (sessionId) {
          // Use sendBeacon for reliable delivery during page unload
          const data = JSON.stringify({
            sessionId,
            cleanupSession: true
          });
          
          // Try to use sendBeacon first (most reliable during page unload)
          if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/papermap', blob);
          } else {
            // Fall back to fetch with keepalive
            fetch('/api/papermap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: data,
              keepalive: true
            }).catch(e => console.error('Error sending cleanup request:', e));
          }
        }
      } catch (error) {
        console.error('Failed to send cleanup request:', error);
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', cleanupSession);

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', cleanupSession);
      cleanupSession(); // Also clean up when component unmounts
    };
  }, []);

  // Get all the mindmap related state and functions from the hook
  const {
    loading,
    loadingStage,
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
    fileName,
    currentLayoutIndex,
    cycleLayout
  } = useMindMap();

  // New state for drag and drop
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  // Prepare context values
  const mindMapContextValue = {
    loading,
    loadingStage,
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

  // Drag and Drop Handlers
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Only show drag overlay if not currently loading/processing
    if (!loading) {
      setIsDraggingOver(true);
      setDropError(null); // Clear error on drag over
    }
  }, [loading]); // Depend on loading state

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Check if the related target (where the cursor moved to) is outside the drop zone
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    setDropError(null); // Reset error on new drop

    // Prevent drop if already loading
    if (loading) {
        setDropError("Cannot upload a new file while another is being processed.");
        return;
    }

    const files = event.dataTransfer.files;

    if (files && files.length > 0) {
      if (files.length > 1) {
        setDropError("Please drop only one PDF file at a time.");
        return;
      }

      const file = files[0];

      // Validate file type
      if (file.type !== 'application/pdf') {
        setDropError("Invalid file type. Please drop a PDF file.");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setDropError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }

      // If valid, set the file to trigger confirmation
      setDroppedFile(file);
    }
  }, [loading]); // Add loading dependency

  // Confirmation Handlers
  const handleConfirmUpload = useCallback(() => {
    if (droppedFile) {
      handleFileUpload(droppedFile); // Call the existing upload handler
      setDroppedFile(null); // Close the dialog
    }
  }, [droppedFile, handleFileUpload]);

  const handleCancelUpload = useCallback(() => {
    setDroppedFile(null); // Close the dialog
  }, []);

  return (
    <UIStateProvider initialLoading={loading} initialError={error}>
      <MindMapProvider value={mindMapContextValue}>
        <PdfViewerProvider initialPdfUrl={pdfUrl} initialFileName={fileName}>
          <div className="flex flex-col h-screen relative">
            <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

            <TopBar 
              onFileUpload={handleFileUpload}
            />
            
            <div className="flex-grow relative" ref={reactFlowWrapper} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
              {/* Drag Over Lay */}
              {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center pointer-events-none z-10">
                  <FileUp className="h-16 w-16 text-primary mb-4" />
                  <p className="text-lg font-semibold text-primary">Drop PDF Here</p>
                </div>
              )}
              {/* ReactFlow */}
              <ReactFlowProvider>
                <MindMapFlow />
              </ReactFlowProvider>

              {/* Drop Error Message */}
              {dropError && !isDraggingOver && ( // Show only if not dragging over and not loading
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive/10 text-destructive text-sm p-3 rounded-md shadow-md flex items-center z-20">
                   <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                   <span>{dropError}</span>
                   <Button variant="neutral" size="sm" onClick={() => setDropError(null)} className="ml-2 p-1 h-auto text-destructive hover:bg-destructive/20">
                      <X className="h-4 w-4" />
                    </Button>
                </div>
              )}
            </div>
            
            {/* PDF Viewer */}
            <PdfViewer />

            {/* Confirmation Dialog */}
            {droppedFile && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full border border-border">
                  <h3 className="text-lg font-semibold mb-4 text-card-foreground">Confirm Upload</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Generate a mind map for this file?
                  </p>
                  <div className="bg-muted/50 p-3 rounded-md mb-6 text-sm break-words border border-border/50">
                    <strong>File:</strong> {droppedFile.name} <br />
                    <strong>Size:</strong> {(droppedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="neutral" onClick={handleCancelUpload}>
                      Cancel
                    </Button>
                    <Button variant="default" onClick={handleConfirmUpload}>
                      Confirm & Generate
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PdfViewerProvider>
      </MindMapProvider>
    </UIStateProvider>
  );
}
