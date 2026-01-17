'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MindMapProvider, PdfViewerProvider } from '../context';
import { useMindMap } from '../hooks/useMindMap';
import MindMapFlow from '../components/MindMapFlow';
import TopBar from '../components/TopBar';
import PdfViewer from '../components/PdfViewer';
import { MindMapNode } from '../types';
import { ReactFlowProvider } from 'reactflow';
import ArchivedContentViewer from '../components/ArchivedContentViewer';
import { usePdfViewerContext } from '../context';
import { useSearchParams } from 'next/navigation';

interface MindmapClientViewProps {
  mindMapNodes: MindMapNode[];
  mindmapTitle: string;
  mindmapInputType: 'pdf' | 'text' | 'url';
  mindmapPdfUrl?: string;
  mindmapSourceUrl?: string;
  mindmapExpiresAt?: string;
  mindmapParsedPdfContent?: string;
  mindmapId?: string; // Added for polling
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
          <TopBar onFileUpload={() => { }} onNewClick={() => { }} inputType={mindmapInputType} />

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
  mindmapExpiresAt,
  mindmapParsedPdfContent,
  mindmapId
}: MindmapClientViewProps) {
  const mindMap = useMindMap() as ReturnType<typeof useMindMap> & { setLoading: (loading: boolean) => void };
  const searchParams = useSearchParams();
  const isStreaming = searchParams.get('streaming') === 'true';
  const [currentNodeCount, setCurrentNodeCount] = useState(mindMapNodes.length);
  const [isPolling, setIsPolling] = useState(isStreaming);
  const [displayTitle, setDisplayTitle] = useState(isStreaming && mindmapTitle === 'Generating...' ? 'Generating...' : mindmapTitle);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const noChangeCount = useRef(0);
  const initialized = useRef(false);

  // Poll for new nodes
  const pollForNodes = useCallback(async () => {
    if (!mindmapId) return;

    try {
      const response = await fetch(`/api/papermap/poll?mindmapId=${mindmapId}&knownCount=${currentNodeCount}`);
      if (!response.ok) return;

      const data = await response.json();

      // Update title if it changed
      if (data.title && data.title !== 'Generating...' && data.title !== displayTitle) {
        setDisplayTitle(data.title);
        mindMap.setFileName(data.title);
      }

      if (data.hasNewNodes && data.nodes && data.nodes.length > currentNodeCount) {
        // We have new nodes - update the mindmap
        mindMap.setMindMapData({ nodes: data.nodes });
        setCurrentNodeCount(data.nodes.length);
        noChangeCount.current = 0;
      } else {
        // No new nodes
        noChangeCount.current++;

        // If no changes for 5 consecutive polls (5 seconds), stop polling
        if (noChangeCount.current >= 5) {
          setIsPolling(false);
          mindMap.setLoading(false);

          // Final title update
          if (data.title && data.title !== 'Generating...') {
            setDisplayTitle(data.title);
            mindMap.setFileName(data.title);
          }
        }
      }
    } catch (error) {
      console.error('Error polling for nodes:', error);
    }
  }, [mindmapId, currentNodeCount, mindMap, displayTitle]);

  // Set up polling
  useEffect(() => {
    if (isPolling && mindmapId) {
      // Start polling every 1 second
      pollIntervalRef.current = setInterval(pollForNodes, 1000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [isPolling, mindmapId, pollForNodes]);

  // Initial data hydration - run once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const { setLoading, setMindMapData, setFileName } = mindMap;

    if (isPolling) {
      // We're streaming - set loading state and initialize with empty or initial nodes
      setLoading(true);
      setFileName(displayTitle);

      if (mindMapNodes.length > 0) {
        setMindMapData({ nodes: mindMapNodes });
        setCurrentNodeCount(mindMapNodes.length);
      } else {
        // Start with empty nodes array - this prevents example mindmap from showing
        setMindMapData({ nodes: [] });
      }
    } else {
      // Not streaming - normal hydration
      if (mindMapNodes && mindMapNodes.length > 0) {
        setLoading(true);
        setMindMapData({ nodes: mindMapNodes });
        setFileName(mindmapTitle || 'Mindmap');
        setCurrentNodeCount(mindMapNodes.length);
        setTimeout(() => {
          setLoading(false);
        }, 400);
      }
    }
  }, [mindMapNodes, mindmapTitle, isPolling, displayTitle, mindMap.setLoading, mindMap.setMindMapData, mindMap.setFileName]);

  return (
    <PdfViewerProvider
      initialFileName={displayTitle || 'Mindmap'}
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