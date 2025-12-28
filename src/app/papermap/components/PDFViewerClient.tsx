'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Import the CSS files from node_modules
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { X, ChevronLeft, ChevronRight, Minus, Plus, SquareArrowOutUpRight } from 'lucide-react';

// Set the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerClientProps {
  pdfBase64: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
  pdfUrl?: string | null;
}

const PDFViewerClient: React.FC<PDFViewerClientProps> = ({ 
  pdfBase64, 
  pdfUrl, 
  isOpen, 
  onClose, 
  initialPage = 1 
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store a safe copy of the PDF data
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  // Set initial scale based on device width
  useEffect(() => {
    const setInitialScale = () => {
      // Check if we're on a mobile device (using window width as a proxy)
      const isMobile = window.innerWidth < 768; // 768px is a common breakpoint for mobile
      
      if (isMobile) {
        setScale(1); // Start with a smaller scale on mobile
      }
    };

    setInitialScale();
    
    // Re-calculate when window is resized
    window.addEventListener('resize', setInitialScale);
    
    return () => {
      window.removeEventListener('resize', setInitialScale);
    };
  }, []);

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
    // If URL is provided, use it
    if (pdfUrl) {
      return pdfUrl;
    }
    
    // Otherwise use binary data if available
    if (pdfBytes) {
      return { data: pdfBytes };
    }
    
    return null;
  }, [pdfBytes, pdfUrl]);

  // Memoize the options prop to prevent unnecessary reloads
  const memoizedOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  // Update page number when initialPage prop changes
  useEffect(() => {
    if (initialPage && numPages) {
      // Check if initialPage is valid (between 1 and numPages)
      if (initialPage >= 1 && initialPage <= numPages) {
        setPageNumber(initialPage);
      } else {
        // Fallback to page 1 if initialPage is invalid
        console.warn(`Invalid page number requested: ${initialPage}. Falling back to page 1.`);
        setPageNumber(1);
      }
    }
  }, [initialPage, numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    
    // Check if initialPage is valid when document loads
    if (initialPage) {
      if (initialPage >= 1 && initialPage <= numPages) {
        setPageNumber(initialPage);
      } else {
        // Fallback to page 1 if initialPage is invalid
        console.warn(`Invalid page number requested: ${initialPage}. Falling back to page 1.`);
        setPageNumber(1);
      }
    }
    
    // Adjust scale to fit container width after a short delay to ensure rendering is complete
    setTimeout(() => {
      const container = containerRef.current;
      const pdfPage = container?.querySelector('.react-pdf__Page');
      
      if (container && pdfPage) {
        const containerWidth = container.clientWidth - 40; // Subtract padding
        const pageWidth = (pdfPage as HTMLElement).clientWidth;
        
        if (pageWidth > containerWidth) {
          // Calculate the ratio to make the page fit within the container
          const newScale = (containerWidth / pageWidth) * scale;
          setScale(Math.max(newScale, 0.5)); // Don't go below 0.5
        }
      }
    }, 100);
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

  // Function to open PDF in native viewer
  const openInNativeViewer = () => {
    // If we have a URL, open it in a new tab
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } 
    // If we have base64 data, create a blob and open it
    else if (pdfBase64) {
      try {
        // Convert base64 to binary array
        const binary = atob(pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        // Create blob with the correct MIME type
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in new tab
        window.open(blobUrl, '_blank');
        
        // Clean up the blob URL after opening (not immediately to ensure it opens)
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      } catch (error) {
        console.error('Error opening PDF:', error);
      }
    }
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
        className="relative bg-background w-full md:w-2/3 lg:w-1/2 h-full overflow-auto shadow-xl animate-slide-in-right"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b flex justify-between items-center p-3 shadow-sm">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted text-foreground"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-sm text-foreground">
              Page {pageNumber} of {numPages || '?'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className={`p-2 rounded-full ${pageNumber <= 1 ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'}`}
              title="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => changePage(1)}
              disabled={numPages !== null && pageNumber >= numPages}
              className={`p-2 rounded-full ${numPages !== null && pageNumber >= numPages ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'}`}
              title="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            
            <div className="h-6 mx-1 border-r border-muted-foreground/30"></div>

            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className={`p-2 rounded-full ${scale <= 0.5 ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'}`}
              title="Zoom out"
            >
              <Minus className="h-5 w-5" />
            </button>

            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className={`p-2 rounded-full ${scale >= 3.0 ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'}`}
              title="Zoom in"
            >
              <Plus className="h-5 w-5" />
            </button>
            
            <div className="h-6 mx-1 border-r border-muted-foreground/30"></div>
            
            <button
              onClick={openInNativeViewer}
              disabled={!memoizedFile}
              className={`p-2 rounded-full ${!memoizedFile ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'}`}
              title="Open in native viewer"
            >
              <SquareArrowOutUpRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Document */}
        <div className="flex justify-center p-4 bg-background">
          {memoizedFile ? (
            <Document
              file={memoizedFile}
              onLoadSuccess={onDocumentLoadSuccess}
              options={memoizedOptions}
              loading={
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
              error={
                <div className="text-destructive p-4">
                  Failed to load PDF. Please try again.
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                loading={
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }
                renderTextLayer={false}
                renderAnnotationLayer={true}
              />
            </Document>
          ) : (
            <div className="text-muted-foreground p-4">
              No PDF document is loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerClient; 