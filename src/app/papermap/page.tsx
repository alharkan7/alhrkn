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
import InputForm from './components/InputForm';
import { useMindMap } from './hooks/useMindMap';
import { combinedStyles } from './styles';
import { MindMapProvider, PdfViewerProvider, UIStateProvider } from './context';
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'

// Define file size limits (copied from Sidebar.tsx)
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PaperMap() {
  const { setTheme } = useTheme();
  // State to track if a mindmap has been created
  const [hasCreatedMindmap, setHasCreatedMindmap] = useState<boolean>(false);
  // State to track the current input type (pdf or text)
  const [inputType, setInputType] = useState<'pdf' | 'text' | null>(null);
  // Local error state for input validation
  const [inputError, setInputError] = useState<string | null>(null);

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
    handleTextInput,
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
    handleTextInput,
    handleResetView,
    loadExampleMindMap,
    currentLayoutIndex,
    cycleLayout
  };

  // Type guard for text input objects
  const isTextInputObject = (input: any): input is { text: string, isTextInput?: boolean, isWebContent?: boolean, sourceUrl?: string } => {
    return typeof input === 'object' && input !== null && 'text' in input && typeof input.text === 'string';
  };

  // Custom handler for input that updates hasCreatedMindmap and input type
  const handleInput = useCallback((input: File | { text: string, isTextInput?: boolean, isWebContent?: boolean, sourceUrl?: string }, blobUrl?: string) => {
    if (isTextInputObject(input)) {
      // Check if this is web content extracted from a URL
      if (input.isWebContent === true && input.sourceUrl) {
        // Handle web content as text input but track source
        setInputType('text');
        handleTextInput(input.text, input.sourceUrl);
        // Filename is handled in handleTextInput
      } 
      // This is a text input object for question/topic
      else if (input.isTextInput === true) {
        // Handle text input for question/topic
        setInputType('text');
        handleTextInput(input.text);
      } else {
        // This is likely a text file being uploaded, not a text query
        setInputError('Please upload a PDF file instead of a text file, or use the Text tab for questions.');
      }
    } else {
      // This is a File object
      setInputType('pdf');
      // Check that the file is a PDF
      if (input.type === 'application/pdf') {
        handleFileUpload(input, blobUrl);
      } else {
        setInputError('Only PDF files are supported for file upload.');
      }
    }
    setHasCreatedMindmap(true);
  }, [handleFileUpload, handleTextInput]);

  // Use combined error from multiple sources
  const combinedError = inputError || error || null;

  // Handler for example badge click
  const handleExampleClick = useCallback(() => {
    loadExampleMindMap();
    setHasCreatedMindmap(true);
    setInputType('pdf'); // Example is PDF-based
  }, [loadExampleMindMap]);

  // Handler for new mindmap click
  const handleNewClick = useCallback(() => {
    setHasCreatedMindmap(false);
    setInputType(null);
    setInputError(null);
  }, []);

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
      handleInput(droppedFile); // Call the modified input handler
      setDroppedFile(null); // Close the dialog
    }
  }, [droppedFile, handleInput]);

  const handleCancelUpload = useCallback(() => {
    setDroppedFile(null); // Close the dialog
  }, []);

  return (
    <UIStateProvider initialLoading={loading} initialError={combinedError}>
      <MindMapProvider value={mindMapContextValue}>
        <PdfViewerProvider initialPdfUrl={pdfUrl} initialFileName={fileName}>
          <div className="flex flex-col h-screen relative">
            <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />

            <div
              className="flex flex-col flex-grow relative overflow-hidden"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              ref={hasCreatedMindmap ? reactFlowWrapper : undefined}
            >

              {!hasCreatedMindmap ? (
                // Show InputForm when no mindmap has been created yet
                <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                  <div className="fixed top-0 left-0 right-0 z-50">
                    <AppsHeader />
                  </div>
                  <div className="text-center py-4">
                    <h1 className="text-5xl md:text-6xl font-black mb-2">
                      Papermap
                    </h1>
                    <div className="text-base md:text-lg text-muted-foreground">
                      <a>
                        Learn Anything with AI Mindmap
                      </a>
                    </div>
                  </div>
                  <InputForm
                    onFileUpload={handleInput}
                    loading={loading}
                    error={combinedError}
                    onExampleClick={handleExampleClick}
                  />
                  <div className="fixed bottom-0 left-0 right-0 py-1 px-0 text-center text-gray-600 text-xs bg-background">
                    <div className="flex-none">
                      <AppsFooter />
                    </div>
                  </div>
                </div>
              ) : (
                // Show the main content when a mindmap has been created
                <>
                  {/* Drag Over Lay - Show on both InputForm and main content */}
                  {isDraggingOver && (
                    <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center pointer-events-none z-10">
                      <FileUp className="h-16 w-16 text-primary mb-4" />
                      <p className="text-lg font-semibold text-primary">Drop PDF Here</p>
                    </div>
                  )}

                  <TopBar
                    onFileUpload={handleInput}
                    onNewClick={handleNewClick}
                    inputType={inputType}
                  />

                  {/* ReactFlow */}
                  <ReactFlowProvider>
                    <div className="flex-grow h-[calc(100vh-4rem)]">
                      <MindMapFlow />
                    </div>
                  </ReactFlowProvider>

                  {/* Drop Error Message - Show on both InputForm and main content */}
                  {dropError && !isDraggingOver && ( // Show only if not dragging over and not loading
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive/10 text-destructive text-sm p-3 rounded-md shadow-md flex items-center z-20">
                      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>{dropError}</span>
                      <Button variant="neutral" size="sm" onClick={() => setDropError(null)} className="ml-2 p-1 h-auto text-destructive hover:bg-destructive/20">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                </>
              )}
            </div>

            {/* PDF Viewer - Only show when a PDF-based mindmap has been created */}
            {hasCreatedMindmap && inputType === 'pdf' && <PdfViewer />}

            {/* Confirmation Dialog */}
            {droppedFile && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full border border-border">
                  <h3 className="text-lg font-semibold mb-4 text-card-foreground">Create a New Mindmap?</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {hasCreatedMindmap ? "The existing mindmap will be replaced." : "A new mindmap will be created."}
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
                      Confirm
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
