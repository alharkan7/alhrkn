'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerClientProps {
  pdfBase64: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
}

const PDFViewerClient: React.FC<PDFViewerClientProps> = ({ pdfBase64, isOpen, onClose, initialPage = 1 }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store a safe copy of the PDF data
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  // Convert base64 to binary data when it changes
  useEffect(() => {
    if (pdfBase64) {
      try {
        // Convert base64 to binary array
        const binary = atob(pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        setPdfBytes(bytes);
      } catch (error) {
        console.error("Error converting base64 to binary:", error);
        setPdfBytes(null);
      }
    } else {
      setPdfBytes(null);
    }
  }, [pdfBase64]);

  // Memoize the file prop to prevent unnecessary reloads
  const memoizedFile = useMemo(() => {
    if (pdfBytes) {
      return { data: pdfBytes };
    }
    return null;
  }, [pdfBytes]);

  // Memoize the options prop to prevent unnecessary reloads
  const memoizedOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  }), []);

  // Update page number when initialPage prop changes
  useEffect(() => {
    if (initialPage && initialPage <= (numPages || Infinity)) {
      setPageNumber(initialPage);
    }
  }, [initialPage, numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (initialPage && initialPage <= numPages) {
      setPageNumber(initialPage);
    }
  };

  const changePage = (offset: number) => {
    const newPage = pageNumber + offset;
    if (numPages && newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-30" 
        onClick={onClose}
      />
      
      {/* PDF Viewer */}
      <div 
        ref={containerRef}
        className="relative bg-white w-full md:w-2/3 lg:w-1/2 h-full overflow-auto shadow-xl animate-slide-in-right"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b flex justify-between items-center p-3 shadow-sm">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            <div className="text-sm">
              Page {pageNumber} of {numPages || '?'}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className={`p-2 rounded-full ${pageNumber <= 1 ? 'text-gray-300' : 'hover:bg-gray-100'}`}
              title="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button 
              onClick={() => changePage(1)}
              disabled={numPages !== null && pageNumber >= numPages}
              className={`p-2 rounded-full ${numPages !== null && pageNumber >= numPages ? 'text-gray-300' : 'hover:bg-gray-100'}`}
              title="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button 
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className={`p-2 rounded-full ${scale <= 0.5 ? 'text-gray-300' : 'hover:bg-gray-100'}`}
              title="Zoom out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button 
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className={`p-2 rounded-full ${scale >= 3.0 ? 'text-gray-300' : 'hover:bg-gray-100'}`}
              title="Zoom in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* PDF Document */}
        <div className="flex justify-center p-4">
          {pdfBytes ? (
            <Document
              file={memoizedFile}
              onLoadSuccess={onDocumentLoadSuccess}
              options={memoizedOptions}
              loading={
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                </div>
              }
              error={
                <div className="text-red-500 p-4">
                  Failed to load PDF. Please try again.
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                loading={
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                  </div>
                }
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          ) : (
            <div className="text-gray-500 p-4">
              No PDF document is loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerClient; 