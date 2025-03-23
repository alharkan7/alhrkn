import React, { useState, useEffect, useRef, memo } from 'react';
import dynamic from 'next/dynamic';

interface PdfViewerProps {
  pdfBase64: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
}

// Dynamically import react-pdf with SSR disabled
const PDFViewer = dynamic<PdfViewerProps>(
  () => import('./PDFViewerClient'),
  { ssr: false }
);

// Memoize the component to prevent unnecessary re-renders
const PdfViewer = memo(({ pdfBase64, isOpen, onClose, initialPage }: PdfViewerProps) => {
  // Simply pass props to the dynamically loaded component
  if (!isOpen) return null;
  
  return <PDFViewer pdfBase64={pdfBase64} isOpen={isOpen} onClose={onClose} initialPage={initialPage} />;
});

// Add display name for React DevTools
PdfViewer.displayName = 'PdfViewer';

export default PdfViewer; 