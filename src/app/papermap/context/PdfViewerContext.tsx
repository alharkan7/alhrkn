'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

interface PdfViewerContextType {
  // State
  pdfBase64: string | null;
  pdfUrl: string | null;
  isPdfViewerOpen: boolean;
  currentPdfPage: number;
  fileName: string;
  sourceUrl: string | null;
  inputType: 'pdf' | 'text' | 'url' | null;
  isPdfAccessExpired: boolean;
  parsedPdfContent: string | null;
  viewMode: 'pdf' | 'archived' | null;
  openArchivedContentViewer: () => void;
  closeViewer: () => void;
  
  // Operations
  setPdfBase64: (base64: string | null) => void;
  setPdfUrl: (url: string | null) => void;
  setFileName: (name: string) => void;
  setSourceUrl: (url: string | null) => void;
  setInputType: (type: 'pdf' | 'text' | 'url' | null) => void;
  openPdfViewer: (pageNumber: number) => void;
  closePdfViewer: () => void;
  handlePdfFile: (file: File, blobUrl?: string) => Promise<void>;
}

const PdfViewerContext = createContext<PdfViewerContextType | undefined>(undefined);

export function usePdfViewerContext() {
  const context = useContext(PdfViewerContext);
  if (context === undefined) {
    throw new Error('usePdfViewerContext must be used within a PdfViewerProvider');
  }
  return context;
}

interface PdfViewerProviderProps {
  children: ReactNode;
  initialPdfUrl?: string | null;
  initialFileName?: string;
  initialSourceUrl?: string | null;
  initialInputType?: 'pdf' | 'text' | 'url' | null;
  initialExpiresAt?: string | null; // ISO date string or null
  initialParsedPdfContent?: string | null;
}

export function PdfViewerProvider({ 
  children,
  initialPdfUrl = null,
  initialFileName = 'mindmap',
  initialSourceUrl = null,
  initialInputType = null,
  initialExpiresAt = null,
  initialParsedPdfContent = null
}: PdfViewerProviderProps) {
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [fileName, setFileName] = useState<string>(initialFileName);
  const [sourceUrl, setSourceUrl] = useState<string | null>(initialSourceUrl);
  const [inputType, setInputType] = useState<'pdf' | 'text' | 'url' | null>(initialInputType);
  
  const [expiresAt, setExpiresAt] = useState<Date | null>(initialExpiresAt ? new Date(initialExpiresAt) : null);
  const [parsedPdfContent, setParsedPdfContent] = useState<string | null>(initialParsedPdfContent);
  const [isPdfAccessExpired, setIsPdfAccessExpired] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'archived' | null>(null);

  // --- Effects to sync initial props to state ---
  useEffect(() => {
    setPdfUrl(initialPdfUrl);
    if (initialPdfUrl) {
      setPdfBase64(null);
    }
  }, [initialPdfUrl]);

  useEffect(() => {
    setFileName(initialFileName);
  }, [initialFileName]);

  useEffect(() => {
    setSourceUrl(initialSourceUrl);
  }, [initialSourceUrl]);

  useEffect(() => {
    setInputType(initialInputType);
  }, [initialInputType]);
  // --- End effects to sync initial props ---

  useEffect(() => {
    setExpiresAt(initialExpiresAt ? new Date(initialExpiresAt) : null);
  }, [initialExpiresAt]);

  useEffect(() => {
    setParsedPdfContent(initialParsedPdfContent);
  }, [initialParsedPdfContent]);

  useEffect(() => {
    if (expiresAt) {
      // Check if current time is past expiresAt
      // Ensure comparison is robust (e.g. both UTC)
      // new Date() is local, but comparison works because Date objects compare based on their UTC ms value.
      setIsPdfAccessExpired(new Date() > expiresAt);
    } else {
      // If no expiresAt date, assume it's not expired (e.g. for example PDF, or if feature isn't used)
      setIsPdfAccessExpired(false);
    }
  }, [expiresAt]);

  // Function to process PDF file
  const handlePdfFile = useCallback(async (file: File, blobUrl?: string) => {
    try {
      // Get filename without extension
      const newFileName = file.name.replace(/\.[^/.]+$/, '');
      setFileName(newFileName);
      
      // If blob URL is provided, use it directly
      if (blobUrl) {
        setPdfUrl(blobUrl);
        // Since we're using the Blob URL, we can clear the base64 data to save memory
        setPdfBase64(null);
        return;
      }
      
      // Clear any previous URL if not using blob URL
      setPdfUrl(null);
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Convert to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(byte => binary += String.fromCharCode(byte));
      const base64 = btoa(binary);
      
      // Set the base64 data
      setPdfBase64(base64);
      
    } catch (error) {
      console.error('Failed to process PDF file:', error);
    }
  }, []);

  // Function to open PDF viewer at a specific page
  const openPdfViewer = useCallback((pageNumber: number) => {
    // Ensure pageNumber is valid, default to page 1 if invalid
    const validPage = pageNumber && pageNumber > 0 ? pageNumber : 1;
    setCurrentPdfPage(validPage);
    setViewMode('pdf');
  }, []);
  
  // Function to close PDF viewer
  const closePdfViewer = useCallback(() => {
    setViewMode(null);
  }, []);

  const openArchivedContentViewer = useCallback(() => {
    if (parsedPdfContent) {
      setViewMode('archived');
    } else {
      console.warn("Attempted to open archived content viewer, but no content is available.");
    }
  }, [parsedPdfContent]);

  const closeViewer = useCallback(() => {
    setViewMode(null);
  }, []);

  const value = {
    pdfBase64,
    pdfUrl,
    isPdfViewerOpen: viewMode === 'pdf',
    currentPdfPage,
    fileName,
    sourceUrl,
    inputType,
    isPdfAccessExpired,
    parsedPdfContent,
    setPdfBase64,
    setPdfUrl,
    setFileName,
    setSourceUrl,
    setInputType,
    openPdfViewer,
    closePdfViewer,
    handlePdfFile,
    viewMode,
    openArchivedContentViewer,
    closeViewer
  };

  return (
    <PdfViewerContext.Provider value={value}>
      {children}
    </PdfViewerContext.Provider>
  );
} 