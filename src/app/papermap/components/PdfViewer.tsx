import React, { useState, useEffect, useRef, memo } from 'react';
import dynamic from 'next/dynamic';

interface PdfViewerProps {
  pdfBase64: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
  pdfUrl?: string | null;
}

// Dynamically import react-pdf with SSR disabled
const PDFViewer = dynamic<PdfViewerProps>(
  () => import('./PDFViewerClient'),
  { ssr: false }
);

// Memoize the component to prevent unnecessary re-renders
const PdfViewer = memo(({ pdfBase64, pdfUrl, isOpen, onClose, initialPage }: PdfViewerProps) => {
  // Simply pass props to the dynamically loaded component
  if (!isOpen) return null;
  
  // Ensure initialPage is a valid positive number
  const validatedInitialPage = initialPage && initialPage > 0 ? initialPage : 1;
  
  return <PDFViewer 
    pdfBase64={pdfBase64} 
    pdfUrl={pdfUrl}
    isOpen={isOpen} 
    onClose={onClose} 
    initialPage={validatedInitialPage} 
  />;
});

// Add display name for React DevTools
PdfViewer.displayName = 'PdfViewer';

export default PdfViewer; 