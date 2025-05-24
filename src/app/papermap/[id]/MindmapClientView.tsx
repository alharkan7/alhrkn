'use client';
import React, { useEffect } from 'react';
import { MindMapProvider, PdfViewerProvider } from '../context';
import { useMindMap } from '../hooks/useMindMap';
import MindMapFlow from '../components/MindMapFlow';
import TopBar from '../components/TopBar';
import PdfViewer from '../components/PdfViewer';
import { MindMapNode } from '../types';
import { ReactFlowProvider } from 'reactflow';
import ArchivedContentViewer from '../components/ArchivedContentViewer';
import { usePdfViewerContext } from '../context';

interface MindmapClientViewProps {
  mindMapNodes: MindMapNode[];
  mindmapTitle: string;
  mindmapInputType: 'pdf' | 'text' | 'url';
  mindmapPdfUrl?: string;
  mindmapSourceUrl?: string;
  originalFileName?: string;
  mindmapExpiresAt?: string;
  mindmapParsedPdfContent?: string;
}

// Define props for the new layout component
interface MindmapViewLayoutProps {
  mindmapInputType: 'pdf' | 'text' | 'url' | null;
  mindMap: ReturnType<typeof useMindMap> & { setLoading: (loading: boolean) => void }; // Pass the mindMap object
}

// New internal layout component
const MindmapViewLayout: React.FC<MindmapViewLayoutProps> = ({ mindmapInputType, mindMap }) => {
  const { 
    viewMode, 
    closeViewer,
    parsedPdfContent: archivedContent
  } = usePdfViewerContext();

  return (
    <MindMapProvider value={mindMap}>
      <ReactFlowProvider>
        <div className="flex flex-col h-[100dvh] relative">
          <TopBar onFileUpload={() => {}} onNewClick={() => {}} inputType={mindmapInputType} />
          
          {viewMode === 'pdf' && <PdfViewer />}
          {viewMode === 'archived' && archivedContent && (
            <ArchivedContentViewer 
              isOpen={true} 
              markdownContent={archivedContent} 
              onClose={closeViewer} 
            />
          )}

          <div className="flex-grow h-[calc(100vh-4rem)]">
            <MindMapFlow />
          </div>
        </div>
      </ReactFlowProvider>
    </MindMapProvider>
  );
};

export default function MindmapClientView({ 
  mindMapNodes, 
  mindmapTitle, 
  mindmapInputType, 
  mindmapPdfUrl,
  mindmapSourceUrl,
  originalFileName,
  mindmapExpiresAt,
  mindmapParsedPdfContent
}: MindmapClientViewProps) {
  const mindMap = useMindMap() as ReturnType<typeof useMindMap> & { setLoading: (loading: boolean) => void };
  // Removed usePdfViewerContext() call from here

  useEffect(() => {
    const { setLoading, setMindMapData, setFileName } = mindMap;
    if (mindMapNodes && mindMapNodes.length > 0) {
      setLoading(true);
      setMindMapData({ nodes: mindMapNodes });
      const displayFileName = (mindmapInputType === 'pdf' && originalFileName) ? originalFileName : mindmapTitle;
      setFileName(displayFileName || 'Mindmap');
      setTimeout(() => {
        setLoading(false);
      }, 400);
    }
  }, [mindMapNodes, mindmapTitle, mindmapInputType, originalFileName, mindMap.setLoading, mindMap.setMindMapData, mindMap.setFileName]);

  return (
    <PdfViewerProvider 
      initialFileName={originalFileName || mindmapTitle || 'Mindmap'} 
      initialPdfUrl={mindmapPdfUrl}
      initialSourceUrl={mindmapSourceUrl}
      initialInputType={mindmapInputType}
      initialExpiresAt={mindmapExpiresAt}
      initialParsedPdfContent={mindmapParsedPdfContent}
    >
      {/* Render the new layout component as a child */}
      <MindmapViewLayout 
        mindmapInputType={mindmapInputType || null} 
        mindMap={mindMap} 
      />
    </PdfViewerProvider>
  );
} 