'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

interface PdfViewerContextType {
  // State
  pdfBase64: string | null;
  pdfUrl: string | null;
  isPdfViewerOpen: boolean;
  currentPdfPage: number;
  fileName: string;
  
  // Operations
  setPdfBase64: (base64: string | null) => void;
  setPdfUrl: (url: string | null) => void;
  setFileName: (name: string) => void;
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
}

export function PdfViewerProvider({ 
  children,
  initialPdfUrl = null,
  initialFileName = 'mindmap'
}: PdfViewerProviderProps) {
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [fileName, setFileName] = useState<string>(initialFileName);

  // --- Add useEffect to update internal state when props change --- 
  useEffect(() => {
    // Update internal pdfUrl state if the initialPdfUrl prop changes
    if (initialPdfUrl !== pdfUrl) { // Avoid unnecessary updates
      setPdfUrl(initialPdfUrl);
      // Clear base64 if we now have a URL
      if (initialPdfUrl) {
        setPdfBase64(null);
      }
    }
  }, [initialPdfUrl, pdfUrl]); // Depend on the prop and the internal state

  useEffect(() => {
    // Update internal fileName state if the initialFileName prop changes
    if (initialFileName !== fileName) { // Avoid unnecessary updates
       setFileName(initialFileName);
    }
  }, [initialFileName, fileName]); // Depend on the prop and the internal state

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
    setIsPdfViewerOpen(true);
  }, []);
  
  // Function to close PDF viewer
  const closePdfViewer = useCallback(() => {
    setIsPdfViewerOpen(false);
  }, []);

  const value = {
    pdfBase64,
    pdfUrl,
    isPdfViewerOpen,
    currentPdfPage,
    fileName,
    setPdfBase64,
    setPdfUrl,
    setFileName,
    openPdfViewer,
    closePdfViewer,
    handlePdfFile
  };

  return (
    <PdfViewerContext.Provider value={value}>
      {children}
    </PdfViewerContext.Provider>
  );
} 