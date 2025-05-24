'use client';
import React, { useEffect } from 'react';
import { MindMapProvider, PdfViewerProvider } from '../context';
import { useMindMap } from '../hooks/useMindMap';
import MindMapFlow from '../components/MindMapFlow';
import TopBar from '../components/TopBar';
import PdfViewer from '../components/PdfViewer';
import { MindMapNode } from '../types';
import { ReactFlowProvider } from 'reactflow';

interface MindmapClientViewProps {
  mindMapNodes: MindMapNode[];
  mindmapTitle: string;
  mindmapInputType: 'pdf' | 'text' | 'url';
  mindmapPdfUrl?: string;
  mindmapSourceUrl?: string;
  originalFileName?: string;
}

export default function MindmapClientView({ 
  mindMapNodes, 
  mindmapTitle, 
  mindmapInputType, 
  mindmapPdfUrl,
  mindmapSourceUrl,
  originalFileName
}: MindmapClientViewProps) {
  // Use the main mindmap hook
  const mindMap = useMindMap() as ReturnType<typeof useMindMap> & { setLoading: (loading: boolean) => void };

  // On mount, set the loaded mindmap data and fileName
  useEffect(() => {
    // Destructure setters for clarity and to use in dependency array
    const { setLoading, setMindMapData, setFileName } = mindMap;

    if (mindMapNodes && mindMapNodes.length > 0) {
      setLoading(true); // Show loader
      setMindMapData({ nodes: mindMapNodes });
      // Use originalFileName if available and inputType is 'pdf', otherwise mindmapTitle
      const displayFileName = (mindmapInputType === 'pdf' && originalFileName) ? originalFileName : mindmapTitle;
      setFileName(displayFileName || 'Mindmap');
      
      setTimeout(() => {
        setLoading(false); // Hide loader after hydration
      }, 400); // Adjust duration as needed
    }
  }, [mindMapNodes, mindmapTitle, mindmapInputType, originalFileName, mindMap.setLoading, mindMap.setMindMapData, mindMap.setFileName]);

  return (
    <PdfViewerProvider 
      initialFileName={originalFileName || mindmapTitle || 'Mindmap'} 
      initialPdfUrl={mindmapPdfUrl}
      initialSourceUrl={mindmapSourceUrl} // Pass sourceUrl to PdfViewerProvider
      initialInputType={mindmapInputType} // Pass inputType to PdfViewerProvider
    >
      <MindMapProvider value={mindMap}>
        <ReactFlowProvider>
          <div className="flex flex-col h-[100dvh] relative">
            <TopBar onFileUpload={() => {}} onNewClick={() => {}} inputType={mindmapInputType || null} />
            <PdfViewer />
            <div className="flex-grow h-[calc(100vh-4rem)]">
              <MindMapFlow />
            </div>
          </div>
        </ReactFlowProvider>
      </MindMapProvider>
    </PdfViewerProvider>
  );
} 