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
            console.log('Session cleanup request sent via sendBeacon');
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
            console.log('Session cleanup request sent via fetch');
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
