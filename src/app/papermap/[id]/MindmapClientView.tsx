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
}

export default function MindmapClientView({ mindMapNodes, mindmapTitle }: MindmapClientViewProps) {
  // Use the main mindmap hook
  const mindMap = useMindMap() as ReturnType<typeof useMindMap> & { setLoading: (loading: boolean) => void };

  // On mount, set the loaded mindmap data and fileName
  useEffect(() => {
    if (mindMapNodes && mindMapNodes.length > 0) {
      mindMap.setLoading(true); // Show loader
      mindMap.setMindMapData({ nodes: mindMapNodes });
      mindMap.setFileName(mindmapTitle || 'MMindmap');
      setTimeout(() => {
        mindMap.setLoading(false); // Hide loader after hydration
      }, 400); // Adjust duration as needed
    }
  }, [mindMapNodes, mindmapTitle]);

  return (
    <PdfViewerProvider initialFileName={mindmapTitle || 'Mindmap'}>
      <MindMapProvider value={mindMap}>
        <ReactFlowProvider>
          <div className="flex flex-col h-[100dvh] relative">
            <TopBar onFileUpload={() => {}} onNewClick={() => {}} inputType={null} />
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