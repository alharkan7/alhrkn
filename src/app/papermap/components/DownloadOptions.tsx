import React, { useState, useRef } from 'react';
import { LoadingCircleIcon, ImageIcon, DocumentIcon, CodeIcon } from './Icons';
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
      // Don't close if we're clicking inside the dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if we're not in the middle of exporting
        if (!isExporting) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, isExporting]); // Add dependencies

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
    console.log("Starting capture...");
    if (!containerRef.current || !data) {
      console.log("Missing refs:", { 
        containerRef: !!containerRef.current, 
        data: !!data 
      });
      throw new Error("Container not available");
    }
    
    // First center the view and wait for animation
    console.log("Preparing for export...");
    await prepareForExport();
    
    // Get the container element
    const container = containerRef.current;
    console.log("Container found:", { 
      width: container.offsetWidth, 
      height: container.offsetHeight 
    });

    try {
      console.log("Setting up capture...");
      // Set background for capture
      if (transparent) {
        container.style.backgroundColor = 'transparent';
      }
      
      // Capture the mindmap
      console.log("Starting html2canvas...");
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        backgroundColor: transparent ? null : '#ffffff',
        onclone: (clonedDoc) => {
          console.log("Cloning document...");
          // Fix styles in the cloned document
          const clonedCards = clonedDoc.querySelectorAll('.node-card');
          clonedCards.forEach(card => {
            const element = card as HTMLElement;
            element.style.overflow = 'visible';
            
            // Ensure descriptions are visible in expanded cards
            const descContainer = element.querySelector('.overflow-hidden') as HTMLElement;
            if (descContainer && descContainer.style.height === 'auto') {
              descContainer.style.overflow = 'visible';
              descContainer.style.maxHeight = 'none';
            }
          });
        }
      });
      
      console.log("Canvas created successfully");
      return canvas;
    } catch (error) {
      console.error("Error during capture:", error);
      throw error;
    } finally {
      console.log("Cleaning up...");
      // Restore background
      if (transparent) {
        container.style.backgroundColor = '';
      }
    }
  };

  // Download as JPEG
  const downloadAsJPEG = async () => {
    console.log("JPEG download started");
    if (!containerRef.current || !data) {
      console.log("Missing refs:", { containerRef: !!containerRef.current, data: !!data });
      return;
    }
    
    try {
      console.log("Setting export state");
      setIsExporting(true);
      setExportType('JPEG');
      
      console.log("Starting capture");
      const canvas = await captureVisibleMindmap(false);
      console.log("Canvas captured:", !!canvas);
      
      // Convert to JPEG with high quality
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      console.log("Data URL created");
      
      const link = document.createElement('a');
      link.download = `${getFormattedFileName()}.jpg`;
      link.href = dataUrl;
      console.log("Triggering download");
      link.click();
      
      setIsOpen(false);
    } catch (error) {
      console.error('Detailed error exporting JPEG:', error);
      alert('Failed to export as JPEG: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Download as PDF
  const downloadAsPDF = async () => {
    if (!containerRef.current || !data) return;
    
    try {
      setIsExporting(true);
      setExportType('PDF');
      
      const canvas = await captureVisibleMindmap(false);
      
      // Convert canvas dimensions to PDF points (72 DPI)
      const width = canvas.width * 0.75;
      const height = canvas.height * 0.75;
      
      // Create PDF with proper orientation
      const orientation = width > height ? 'landscape' : 'portrait';
      const pdf = new jsPDF(orientation, 'pt', [width, height]);
      
      // Add the image to PDF
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      
      // Save the PDF
      pdf.save(`${getFormattedFileName()}.pdf`);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export as PDF');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Download as PNG (transparent)
  const downloadAsPNG = async () => {
    if (!containerRef.current || !data) return;
    
    try {
      setIsExporting(true);
      setExportType('PNG');
      
      const canvas = await captureVisibleMindmap(true);
      
      // Convert to PNG with transparency
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${getFormattedFileName()}.png`;
      link.href = dataUrl;
      link.click();
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting PNG:', error);
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
            <LoadingCircleIcon />
            <span>Exporting {exportType}...</span>
          </>
        ) : (
          <>
            Download
          </>
        )}
      </button>
      
      {isOpen && !isExporting && (
        <div 
          className="absolute right-0 mt-2 w-25 bg-white rounded-md shadow-lg z-50 overflow-hidden ring-1 ring-black ring-opacity-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("JPEG button clicked");
                downloadAsJPEG().catch(err => {
                  console.error("JPEG download error:", err);
                  alert("Failed to download JPEG: " + (err instanceof Error ? err.message : String(err)));
                });
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <ImageIcon />
              JPEG
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("PNG button clicked");
                downloadAsPNG().catch(err => {
                  console.error("PNG download error:", err);
                  alert("Failed to download PNG: " + (err instanceof Error ? err.message : String(err)));
                });
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <ImageIcon />
              PNG
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("PDF button clicked");
                downloadAsPDF().catch(err => {
                  console.error("PDF download error:", err);
                  alert("Failed to download PDF: " + (err instanceof Error ? err.message : String(err)));
                });
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <DocumentIcon />
              PDF
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("JSON button clicked");
                downloadAsJSON();
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <CodeIcon />
              JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadOptions; 