'use client';
import React, { useEffect, useState, useRef } from 'react';
import { MindMapProvider, PdfViewerProvider } from '../context';
import { useMindMap } from '../hooks/useMindMap';
import MindMapFlow from '../components/MindMapFlow';
import TopBar from '../components/TopBar';
import PdfViewer from '../components/PdfViewer';
import { MindMapNode } from '../types';
import { ReactFlowProvider } from 'reactflow';
import ArchivedContentViewer from '../components/ArchivedContentViewer';
import { usePdfViewerContext } from '../context';
import { useSearchParams, useRouter } from 'next/navigation';

interface MindmapClientViewProps {
  mindMapNodes: MindMapNode[];
  mindmapTitle: string;
  mindmapInputType: 'pdf' | 'text' | 'url';
  mindmapPdfUrl?: string;
  mindmapSourceUrl?: string;
  mindmapExpiresAt?: string;
  mindmapParsedPdfContent?: string;
  mindmapId?: string;
}

interface MindmapViewLayoutProps {
  mindmapInputType: 'pdf' | 'text' | 'url' | null;
  mindMap: ReturnType<typeof useMindMap> & { setLoading: (loading: boolean) => void };
}

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
  const router = useRouter();
  const isStreaming = searchParams.get('streaming') === 'true';

  const [displayTitle, setDisplayTitle] = useState(mindmapTitle);
  const [nodesLoaded, setNodesLoaded] = useState(mindMapNodes.length > 0);

  // Store stable refs to avoid dependency issues
  const mindMapRef = useRef(mindMap);
  const routerRef = useRef(router);
  mindMapRef.current = mindMap;
  routerRef.current = router;

  // Effect 1: Initialize with provided data
  useEffect(() => {
    if (mindMapNodes && mindMapNodes.length > 0) {
      mindMapRef.current.setMindMapData({ nodes: mindMapNodes });
      mindMapRef.current.setFileName(mindmapTitle || 'Mindmap');
      mindMapRef.current.setLoading(false);
      setDisplayTitle(mindmapTitle);
      setNodesLoaded(true);
    } else if (isStreaming) {
      mindMapRef.current.setMindMapData({ nodes: [] });
      mindMapRef.current.setFileName('Generating...');
      mindMapRef.current.setLoading(true);
    }
  }, [mindMapNodes, mindmapTitle, isStreaming]);

  // Effect 2: Polling - continues until streaming is complete
  useEffect(() => {
    // Skip if not streaming
    if (!isStreaming || !mindmapId) {
      return;
    }

    let isActive = true;
    let pollCount = 0;
    let lastNodeCount = 0;
    let noChangeCount = 0;
    const maxPolls = 120; // Max 4 minutes at 2s intervals
    const noChangeThreshold = 5; // Stop after 5 polls with no new nodes

    const poll = async () => {
      if (!isActive) return;

      try {
        const response = await fetch(`/api/papermap/poll?mindmapId=${mindmapId}&knownCount=${lastNodeCount}`);
        if (!response.ok || !isActive) return;

        const data = await response.json();

        if (data.nodes && data.nodes.length > 0) {
          // Update mindmap with current nodes
          mindMapRef.current.setMindMapData({ nodes: data.nodes });

          // Update title if available
          if (data.title && data.title !== 'Generating...') {
            mindMapRef.current.setFileName(data.title);
            setDisplayTitle(data.title);
          }

          // Hide loader once we have first batch of nodes
          mindMapRef.current.setLoading(false);

          // Check if we got new nodes since last poll
          if (data.nodes.length > lastNodeCount) {
            noChangeCount = 0;
            lastNodeCount = data.nodes.length;
          } else {
            noChangeCount++;
          }
        } else {
          noChangeCount++;
        }

        // Stop polling if no changes for threshold polls (streaming complete)
        if (noChangeCount >= noChangeThreshold) {
          isActive = false;
          setNodesLoaded(true);
          // Remove streaming param from URL
          routerRef.current.replace(`/papermap/${mindmapId}`, { scroll: false });
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    const pollInterval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls || !isActive) {
        clearInterval(pollInterval);
        mindMapRef.current.setLoading(false);
        setNodesLoaded(true);
        routerRef.current.replace(`/papermap/${mindmapId}`, { scroll: false });
        return;
      }
      await poll();
    }, 2000);

    // First poll immediately
    poll();

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }, [isStreaming, mindmapId]);

  return (
    <PdfViewerProvider
      initialFileName={displayTitle || 'Mindmap'}
      initialPdfUrl={mindmapPdfUrl}
      initialSourceUrl={mindmapSourceUrl}
      initialInputType={mindmapInputType}
      initialExpiresAt={mindmapExpiresAt}
      initialParsedPdfContent={mindmapParsedPdfContent}
    >
      <MindmapViewLayout
        mindmapInputType={mindmapInputType || null}
        mindMap={mindMap}
      />
    </PdfViewerProvider>
  );
}