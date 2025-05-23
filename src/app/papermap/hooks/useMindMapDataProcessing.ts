'use client';

import { useCallback, Dispatch, SetStateAction, RefObject } from 'react';
import { Node, Edge, ReactFlowInstance } from 'reactflow';
import { MindMapData, NodePosition } from '../types';
import { EXAMPLE_MINDMAP, EXAMPLE_PDF_URL } from '../data/sampleMindmap';

interface UseMindMapDataProcessingProps {
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingStage: Dispatch<SetStateAction<'uploading' | 'processing' | 'building' | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setUploadError: Dispatch<SetStateAction<Error | null>>;
  setMindMapData: Dispatch<SetStateAction<MindMapData | null>>;
  setPdfUrl: Dispatch<SetStateAction<string | null>>;
  setFileName: Dispatch<SetStateAction<string>>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setNodePositions: Dispatch<SetStateAction<Record<string, NodePosition>>>;
  setCollapsedNodes: Dispatch<SetStateAction<Set<string>>>;
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  // fileLoading and setFileLoading were present in original state, but not directly used by these functions.
  // If they are needed for UI elsewhere, the main hook can still expose them from useMindMapState.
}

export function useMindMapDataProcessing({
  setLoading,
  setLoadingStage,
  setError,
  setUploadError,
  setMindMapData,
  setPdfUrl,
  setFileName,
  setNodes,
  setEdges,
  setNodePositions,
  setCollapsedNodes,
  reactFlowInstanceRef,
}: UseMindMapDataProcessingProps) {

  const loadExampleMindMap = useCallback(() => {
    setLoading(true);
    setLoadingStage('processing');
    setError(null);
    setMindMapData(EXAMPLE_MINDMAP);
    setPdfUrl(EXAMPLE_PDF_URL);
    setFileName('mindmap');
    setCollapsedNodes(new Set());
    setNodes([]); // Clear existing nodes to trigger re-render from new mindMapData
    setEdges([]); // Clear existing edges
    setNodePositions({});

    localStorage.setItem('pdfBlobUrl', EXAMPLE_PDF_URL);
    localStorage.removeItem('userHasUploadedPdf'); // Reset this flag for example
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('currentSessionId');

    setTimeout(() => {
      setLoading(false);
      setLoadingStage(null);
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.4, duration: 800, includeHiddenNodes: false });
        }
      }, 300);
    }, 100);
  }, [setLoading, setLoadingStage, setError, setMindMapData, setPdfUrl, setFileName, setCollapsedNodes, setNodes, setEdges, setNodePositions, reactFlowInstanceRef]);

  const generateInitialMindMap = useCallback(async (fileNameInput: string, pdfBlobUrl: string) => {
    setError(null);
    setLoadingStage('processing');
    try {
      const response = await fetch('/api/papermap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobUrl: pdfBlobUrl, fileName: fileNameInput, chatHistory: [] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF');
      }
      const data = await response.json();
      setLoadingStage('building');
      if (data && data.mindmap && typeof data.mindmap === 'object') {
        setMindMapData(data.mindmap);
        if (data.chatHistory) {
          try {
            const formattedChatHistory = data.chatHistory.map((msg: any) => ({ ...msg, role: msg.role === 'assistant' ? 'model' : msg.role }));
            localStorage.setItem('chatHistory', JSON.stringify(formattedChatHistory));
          } catch (storageError) { console.warn('Failed to store chat history:', storageError); }
        }
      } else { throw new Error('Invalid mind map data received'); }
      
      // Nodes/edges will be set by the layout effect in useMindMapLayout based on new mindMapData
      // Fit view after layout is applied
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.4, duration: 800, includeHiddenNodes: false });
        }
      }, 100); // Adjust timing if needed, should be after layout effect
      return true;
    } catch (err) {
      console.error('Error generating mindmap:', err);
      throw err; 
    }
  }, [setMindMapData, setError, setLoadingStage, reactFlowInstanceRef]); // Removed setNodes, setEdges as layout hook handles this

  const handleFileUpload = useCallback(async (file: File, blobUrl?: string) => {
    if (!file) return null;
    setLoading(true);
    setLoadingStage('uploading');
    setError(null);
    setUploadError(null);

    try {
      if (file.type !== 'application/pdf') throw new Error('Only PDF files are supported');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('pdfSessionId');
      localStorage.removeItem('pdfSessionData');
      const existingPdfUrl = localStorage.getItem('pdfBlobUrl');
      if (existingPdfUrl && existingPdfUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf')) {
        localStorage.removeItem('pdfBlobUrl');
      }
      try { localStorage.setItem('userHasUploadedPdf', 'true'); } 
      catch (error) { console.warn('Failed to set userHasUploadedPdf flag'); }

      let uploadedBlobUrl: string;
      if (!blobUrl) {
        const { upload } = await import('@vercel/blob/client');
        const blob = await upload(file.name, file, {
          access: 'public', handleUploadUrl: '/api/papermap/blob',
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        } as any);
        if (!blob.url) throw new Error('No blob URL returned from upload');
        uploadedBlobUrl = blob.url;
      } else {
        uploadedBlobUrl = blobUrl;
      }

      localStorage.setItem('pdfBlobUrl', uploadedBlobUrl);
      localStorage.setItem('currentPdfBlobUrl', uploadedBlobUrl);
      setPdfUrl(uploadedBlobUrl);
      setFileName(file.name);

      setMindMapData(null); // Clear old data
      setNodes([]);
      setEdges([]);
      setNodePositions({});
      setCollapsedNodes(new Set());
      
      // setLoadingStage('processing'); // generateInitialMindMap sets this
      const response = await fetch('/api/papermap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobUrl: uploadedBlobUrl, fileName: file.name, chatHistory: [] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF');
      }
      const data = await response.json();
      setLoadingStage('building');
      if (data && data.mindmap && typeof data.mindmap === 'object') {
        setMindMapData(data.mindmap);
        if (data.chatHistory) {
          try {
            const formattedChatHistory = data.chatHistory.map((msg: any) => ({ ...msg, role: msg.role === 'assistant' ? 'model' : msg.role }));
            localStorage.setItem('chatHistory', JSON.stringify(formattedChatHistory));
          } catch (storageError) { console.warn('Failed to store chat history:', storageError); }
        }
      } else { throw new Error('Invalid mind map data received'); }
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.4, duration: 800, includeHiddenNodes: false });
        }
      }, 100);
      setLoading(false);
      setLoadingStage(null);
      return data; // Return full API response (with mindmapId)
    } catch (error) {
      console.error('Error handling file upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
      setUploadError(error instanceof Error ? error : new Error('Unknown upload error'));
      setError(errorMessage);
      setLoading(false);
      setLoadingStage(null);
      return null;
    }
  }, [ setLoading, setLoadingStage, setError, setUploadError, setPdfUrl, setFileName, 
       setMindMapData, setNodes, setEdges, setNodePositions, setCollapsedNodes, 
       reactFlowInstanceRef ]);

  const handleTextInput = useCallback(async (text: string, sourceUrl?: string) => {
    setLoading(true);
    setLoadingStage('processing');
    setError(null);
    setUploadError(null);

    try {
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('pdfSessionId');
      localStorage.removeItem('pdfSessionData');
      localStorage.removeItem('pdfBlobUrl'); // Clear any PDF URL for text input
      localStorage.removeItem('currentPdfBlobUrl');

      setMindMapData(null);
      setNodes([]);
      setEdges([]);
      setNodePositions({});
      setCollapsedNodes(new Set());

      if (sourceUrl) {
        try { const url = new URL(sourceUrl); setFileName(`URL: ${url.hostname}${url.pathname}`); }
        catch (e) { setFileName(`URL: ${sourceUrl}`); }
      } else {
        setFileName(text.length > 60 ? `${text.substring(0, 60)}...` : text);
      }
      setPdfUrl(null);
      if (sourceUrl) localStorage.setItem('sourceUrl', sourceUrl); else localStorage.removeItem('sourceUrl');

      const response = await fetch('/api/papermap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textInput: text, sourceUrl: sourceUrl, chatHistory: [] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process text input');
      }
      const data = await response.json();
      setLoadingStage('building');
      if (data && data.mindmap && typeof data.mindmap === 'object') {
        setMindMapData(data.mindmap);
        if (data.chatHistory) {
          try {
            const formattedChatHistory = data.chatHistory.map((msg: any) => ({ ...msg, role: msg.role === 'assistant' ? 'model' : msg.role }));
            localStorage.setItem('chatHistory', JSON.stringify(formattedChatHistory));
          } catch (storageError) { console.warn('Failed to store chat history:', storageError); }
        }
      } else { throw new Error('Invalid mind map data received'); }
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.4, duration: 800, includeHiddenNodes: false });
        }
      }, 100); 
      setLoading(false);
      setLoadingStage(null);
      return data; // Return full API response (with mindmapId)
    } catch (error) {
      console.error('Error handling text input:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process text input';
      setUploadError(error instanceof Error ? error : new Error('Unknown error'));
      setError(errorMessage);
      setLoading(false);
      setLoadingStage(null);
      return null;
    }
  }, [ setLoading, setLoadingStage, setError, setUploadError, setMindMapData, setNodes, setEdges, 
       setNodePositions, setCollapsedNodes, setFileName, setPdfUrl, reactFlowInstanceRef ]);

  // Effect for initial example PDF URL in localStorage (if not already set by user upload)
  // This was in the original hook; ensure it runs once on mount.
  // This should ideally be in the main hook or a setup effect there.
  // For now, placing here for completeness of moved logic.
  // useEffect(() => {
  //   const existingBlobUrl = localStorage.getItem('pdfBlobUrl');
  //   if (!existingBlobUrl) {
  //     localStorage.setItem('pdfBlobUrl', EXAMPLE_PDF_URL);
  //   }
  // }, []); // Empty dependency array means run once on mount

  return {
    loadExampleMindMap,
    handleFileUpload,
    handleTextInput,
    generateInitialMindMap, // Expose if needed directly, though usually called by handleFileUpload
  };
}
