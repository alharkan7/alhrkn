import React, { useState, useRef } from 'react';
import { ChevronDownIcon } from './Icons';
import { MindMapData, NodePosition } from './MindMapTypes';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DownloadOptionsProps {
  data: MindMapData | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onResetZoom: () => void;
  nodePositions: Record<string, NodePosition>;
  fileName?: string;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ 
  data, 
  containerRef, 
  onResetZoom,
  nodePositions,
  fileName = "mindmap"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Format the file name for downloads
  const getFormattedFileName = () => {
    if (!fileName) return "mindmap";
    
    // Remove file extension if present and replace spaces with underscores
    const baseName = fileName.replace(/\.[^/.]+$/, "").trim().toLowerCase();
    return baseName.replace(/\s+/g, "_") + "_mindmap";
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isExporting) {
      setIsOpen(!isOpen);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Prepare for export - centers the view and waits for animation to complete
  const prepareForExport = () => {
    return new Promise<void>((resolve) => {
      // First call the reset zoom to center the mindmap
      onResetZoom();
      
      // Wait for the animation to complete
      setTimeout(() => {
        resolve();
      }, 650);
    });
  };

  // Improved approach for capturing the mindmap
  const captureVisibleMindmap = async (transparent = false) => {
    if (!containerRef.current?.parentElement || !data) {
      throw new Error("Container not available");
    }
    
    // First center the view and wait for animation
    await prepareForExport();
    
    // Get the container element (the viewport that contains the mindmap)
    const container = containerRef.current.parentElement;
    
    // Calculate the actual bounds of the mindmap content
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Find all node cards to determine content boundaries
    const nodeCards = container.querySelectorAll('.node-card');
    nodeCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Convert to container-relative coordinates
      const relX = rect.left - containerRect.left;
      const relY = rect.top - containerRect.top;
      
      minX = Math.min(minX, relX);
      minY = Math.min(minY, relY);
      maxX = Math.max(maxX, relX + rect.width);
      maxY = Math.max(maxY, relY + rect.height);
    });
    
    // Add margin (50px on each side)
    const margin = 50;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(container.clientWidth, maxX + margin);
    maxY = Math.min(container.clientHeight, maxY + margin);
    
    // Calculate dimensions
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Temporarily hide elements that shouldn't be in the export
    const edgeIndicators = container.querySelectorAll('.bg-gradient-to-b, .bg-gradient-to-t, .bg-gradient-to-r, .bg-gradient-to-l');
    const hiddenElements: HTMLElement[] = [];
    
    // Store original display values and hide elements
    edgeIndicators.forEach((el) => {
      const element = el as HTMLElement;
      hiddenElements.push(element);
      element.dataset.originalDisplay = element.style.display;
      element.style.display = 'none';
    });
    
    // Find and hide zoom controls
    const zoomControls = container.querySelector('.bottom-4') as HTMLElement;
    if (zoomControls) {
      hiddenElements.push(zoomControls);
      zoomControls.dataset.originalDisplay = zoomControls.style.display;
      zoomControls.style.display = 'none';
    }
    
    // Find and hide selection counter if present
    const selectionCounter = container.querySelector('.bottom-\\[max\\(1rem\\,calc\\(env\\(safe-area-inset-bottom\\)\\+0\\.5rem\\)\\)\\]') as HTMLElement;
    if (selectionCounter) {
      hiddenElements.push(selectionCounter);
      selectionCounter.dataset.originalDisplay = selectionCounter.style.display;
      selectionCounter.style.display = 'none';
    }
    
    // Store original background color
    const originalBgColor = container.style.backgroundColor;
    
    // If exporting transparent PNG, temporarily make the container background transparent
    if (transparent) {
      container.style.backgroundColor = 'transparent';
    }
    
    // Fix ONLY the title elements, leave description text alone
    const originalStyles: Array<{element: HTMLElement, props: Record<string, string>}> = [];
    
    // Find and fix each card's h3 title
    nodeCards.forEach(card => {
      // Fix only the h3 title element
      const titleEl = card.querySelector('h3') as HTMLElement;
      if (titleEl) {
        // Store original styles for restoration
        const original = {
          element: titleEl,
          props: {
            position: titleEl.style.position,
            margin: titleEl.style.margin,
            padding: titleEl.style.padding,
            lineHeight: titleEl.style.lineHeight,
            display: titleEl.style.display,
            transform: titleEl.style.transform
          }
        };
        
        originalStyles.push(original);
        
        // Apply fix only to title
        titleEl.style.position = 'static';
        titleEl.style.margin = '0';
        titleEl.style.padding = '0';
        titleEl.style.lineHeight = '1.3';
        titleEl.style.transform = 'none';
      }
      
      // Ensure the description container has proper height if expanded
      const descContainer = card.querySelector('.overflow-hidden') as HTMLElement;
      if (descContainer) {
        const isExpanded = window.getComputedStyle(descContainer).maxHeight !== '0px';
        if (isExpanded) {
          const origMaxHeight = descContainer.style.maxHeight;
          const origHeight = descContainer.style.height;
          
          // Store for restoration
          originalStyles.push({
            element: descContainer,
            props: {
              maxHeight: origMaxHeight,
              height: origHeight
            }
          });
          
          // Ensure enough height for content
          descContainer.style.maxHeight = 'none';
          descContainer.style.height = 'auto';
        }
      }
    });
    
    try {
      // Capture the visible portion of the mindmap
      const canvas = await html2canvas(container, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: transparent ? undefined : '#f9fafb', // Use undefined for true transparency
        allowTaint: true,
        logging: false,
        // Crop to just the mindmap content area plus margin
        x: minX,
        y: minY,
        width: width,
        height: height,
        // Exclude control elements and edge indicators
        ignoreElements: (element) => {
          // Check if the element is a control button or panel
          return (
            // Exclude zoom controls
            (element.classList?.contains('bottom-4')) ||
            // Exclude selection counter
            (element.classList?.contains('bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))]')) ||
            // Exclude header
            element.classList?.contains('border-b') ||
            // Exclude edge indicators/shadows
            element.classList?.contains('bg-gradient-to-b') ||
            element.classList?.contains('bg-gradient-to-t') ||
            element.classList?.contains('bg-gradient-to-r') ||
            element.classList?.contains('bg-gradient-to-l') ||
            // Exclude info tip
            element.classList?.contains('top-4')
          );
        },
        onclone: (documentClone, element) => {
          // Handle transparency in PNG exports - only make the background transparent
          if (transparent) {
            // Make only container and main background elements transparent
            const containerEl = documentClone.querySelector('.bg-gray-50') as HTMLElement;
            if (containerEl) {
              containerEl.style.backgroundColor = 'transparent';
            }
            
            // Also remove any bg-gray-* classes that might be on background elements
            const bgElements = documentClone.querySelectorAll('.bg-gray-50, .bg-gray-100, .bg-gray-200');
            bgElements.forEach(el => {
              (el as HTMLElement).style.backgroundColor = 'transparent';
            });
            
            // Clear any other background elements that aren't part of cards
            const otherBgElements = documentClone.querySelectorAll('body, .flex-1, .relative, .overflow-hidden');
            otherBgElements.forEach(el => {
              if (!(el as HTMLElement).closest('.node-card') && !(el as HTMLElement).classList.contains('bg-white')) {
                (el as HTMLElement).style.backgroundColor = 'transparent';
              }
            });
          }
          
          // Apply the same fixes to the cloned document's title elements
          const cardTitles = documentClone.querySelectorAll('.node-card h3');
          cardTitles.forEach(titleEl => {
            const element = titleEl as HTMLElement;
            element.style.position = 'static';
            element.style.margin = '0';
            element.style.padding = '0';
            element.style.lineHeight = '1.3';
            element.style.transform = 'none';
          });
          
          // Fix description container overflow in the clone
          const descContainers = documentClone.querySelectorAll('.node-card .overflow-hidden');
          descContainers.forEach(container => {
            const element = container as HTMLElement;
            const isExpanded = window.getComputedStyle(element).maxHeight !== '0px';
            if (isExpanded) {
              element.style.maxHeight = 'none';
              element.style.height = 'auto';
              element.style.paddingBottom = '5px'; // Add extra space at bottom to prevent cutoff
              
              // Ensure description paragraph has enough space
              const descText = element.querySelector('p');
              if (descText) {
                (descText as HTMLElement).style.paddingBottom = '5px';
              }
            }
          });
          
          // Increase card padding to prevent text cutoff
          const cardBodies = documentClone.querySelectorAll('.node-card .bg-white');
          cardBodies.forEach(card => {
            const element = card as HTMLElement;
            element.style.paddingBottom = '12px'; // Add extra padding at bottom
          });
        }
      });
      
      return canvas;
    } finally {
      // Restore all original styles
      originalStyles.forEach(item => {
        const element = item.element;
        Object.entries(item.props).forEach(([prop, value]) => {
          element.style[prop as any] = value;
        });
      });
      
      // Restore display of hidden elements
      hiddenElements.forEach(element => {
        if (element.dataset.originalDisplay !== undefined) {
          element.style.display = element.dataset.originalDisplay;
          delete element.dataset.originalDisplay;
        }
      });
      
      // Restore background color
      container.style.backgroundColor = originalBgColor;
    }
  };

  // Download as JPEG
  const downloadAsJPEG = async () => {
    if (!containerRef.current?.parentElement || !data) return;
    
    try {
      setIsExporting(true);
      setExportType('JPEG');
      
      const canvas = await captureVisibleMindmap(false);
      
      // Convert to JPEG and download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${getFormattedFileName()}.jpg`;
      a.click();
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error generating JPEG:', error);
      alert('Failed to export as JPEG');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Download as PDF
  const downloadAsPDF = async () => {
    if (!containerRef.current?.parentElement || !data) return;
    
    try {
      setIsExporting(true);
      setExportType('PDF');
      
      const canvas = await captureVisibleMindmap(false);
      
      // Get the canvas data as an image
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Create PDF with the same dimensions as the image
      const width = canvas.width;
      const height = canvas.height;
      
      // Convert from pixels to mm (assuming 96 DPI)
      const pxToMm = 0.264583;
      const pdfWidth = Math.floor(width * pxToMm);
      const pdfHeight = Math.floor(height * pxToMm);
      
      // Create PDF with dimensions that match the canvas
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      // Add the image at full size
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.save(`${getFormattedFileName()}.pdf`);
      setIsOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to export as PDF');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Download as PNG (transparent)
  const downloadAsPNG = async () => {
    if (!containerRef.current?.parentElement || !data) return;
    
    try {
      setIsExporting(true);
      setExportType('PNG');
      
      const canvas = await captureVisibleMindmap(true);
      
      // Create a new canvas with transparency properly set
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      
      const ctx = finalCanvas.getContext('2d', { alpha: true });
      if (ctx) {
        // Set global composite operation to ensure transparency is preserved
        ctx.globalCompositeOperation = 'source-over';
        
        // Clear to transparent before drawing
        ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Draw the image onto transparent canvas
        ctx.drawImage(canvas, 0, 0);
        
        // Force png format with transparency preserved
        const finalDataUrl = finalCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = finalDataUrl;
        a.download = `${getFormattedFileName()}.png`;
        a.click();
      } else {
        // Fallback if context creation fails
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${getFormattedFileName()}.png`;
        a.click();
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Failed to export as PNG');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Download as JSON
  const downloadAsJSON = () => {
    if (!data) return;
    
    try {
      setIsExporting(true);
      setExportType('JSON');
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `${getFormattedFileName()}.json`;
      a.click();
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error generating JSON:', error);
      alert('Failed to export as JSON');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`flex items-center space-x-1 px-4 py-2 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
          isExporting 
            ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
        disabled={!data || isExporting}
      >
        {isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Exporting {exportType}...</span>
          </>
        ) : (
          <>
            Download
          </>
        )}
      </button>
      
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-25 bg-white rounded-md shadow-lg z-50 overflow-hidden ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <button
              onClick={downloadAsJPEG}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              JPEG
            </button>

            <button
              onClick={downloadAsPNG}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              PNG
            </button>
            
            <button
              onClick={downloadAsPDF}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            
            <button
              onClick={downloadAsJSON}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadOptions; 