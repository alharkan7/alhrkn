import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MindMapData, NodePosition } from './MindMapTypes';

interface DownloadOptionsProps {
  data: MindMapData;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onResetZoom: () => void;
  nodePositions: Record<string, NodePosition>;
  fileName: string;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({
  data,
  containerRef,
  onResetZoom,
  nodePositions,
  fileName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadJSON = () => {
    // Create a JSON file with the mindmap data including node positions
    const enhancedData = {
      ...data,
      nodes: data.nodes.map(node => ({
        ...node,
        position: nodePositions[node.id] || { x: 0, y: 0 }
      }))
    };

    const jsonString = JSON.stringify(enhancedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadImage = async (format: 'png' | 'jpg') => {
    if (!containerRef.current) return;
    
    setIsDownloading(true);
    
    try {
      // First, reset zoom to get a good view of the entire mindmap
      onResetZoom();
      
      // Wait a moment for the reset to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the ReactFlow container (the actual mindmap, not including buttons)
      const flowElement = containerRef.current.querySelector('.react-flow') as HTMLElement;
      if (!flowElement) {
        throw new Error('Could not find flow element');
      }
      
      // Find all nodes and determine the bounding box
      const nodes = flowElement.querySelectorAll('.react-flow__node');
      if (nodes.length === 0) {
        throw new Error('No nodes found in the mindmap');
      }
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
      });
      
      // Add padding
      const padding = 50;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      
      // Get the viewport for proper rendering
      const viewport = flowElement.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) {
        throw new Error('Could not find viewport element');
      }
      
      // Calculate viewport transform
      const transformStyle = window.getComputedStyle(viewport).transform;
      const matrix = new DOMMatrix(transformStyle);
      
      // Apply transform to our coordinates
      const transformedWidth = maxX - minX;
      const transformedHeight = maxY - minY;
      
      const options = {
        backgroundColor: format === 'png' ? null : '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        removeContainer: false,
        x: minX - flowElement.getBoundingClientRect().left,
        y: minY - flowElement.getBoundingClientRect().top,
        width: transformedWidth,
        height: transformedHeight,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
        ignoreElements: (element: Element) => {
          // Ignore controls, minimap and other UI elements for PNG (transparent) format
          if (format === 'png') {
            return element.classList.contains('react-flow__controls') || 
                   element.classList.contains('react-flow__minimap') ||
                   element.classList.contains('react-flow__attribution');
          }
          return false;
        }
      };
      
      const canvas = await html2canvas(flowElement, options);
      
      // Convert canvas to URL
      const imgData = canvas.toDataURL(`image/${format}`, format === 'jpg' ? 0.85 : 1.0);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPDF = async () => {
    if (!containerRef.current) return;
    
    setIsDownloading(true);
    
    try {
      // First, reset zoom to get a good view
      onResetZoom();
      
      // Wait a moment for the reset to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the ReactFlow container
      const flowElement = containerRef.current.querySelector('.react-flow') as HTMLElement;
      if (!flowElement) {
        throw new Error('Could not find flow element');
      }
      
      // Find all nodes and determine the bounding box
      const nodes = flowElement.querySelectorAll('.react-flow__node');
      if (nodes.length === 0) {
        throw new Error('No nodes found in the mindmap');
      }
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
      });
      
      // Add padding
      const padding = 50;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      
      const transformedWidth = maxX - minX;
      const transformedHeight = maxY - minY;
      
      const canvas = await html2canvas(flowElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        x: minX - flowElement.getBoundingClientRect().left,
        y: minY - flowElement.getBoundingClientRect().top,
        width: transformedWidth,
        height: transformedHeight,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(
        imgData, 
        'JPEG', 
        0, 
        0, 
        canvas.width, 
        canvas.height
      );
      
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Download
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-2 min-w-[200px]">
          <div className="space-y-2">
            <button
              onClick={() => downloadImage('jpg')}
              disabled={isDownloading}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Download as JPG
            </button>
            
            <button
              onClick={() => downloadImage('png')}
              disabled={isDownloading}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Download as PNG (transparent)
            </button>
            
            <button
              onClick={downloadPDF}
              disabled={isDownloading}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Download as PDF
            </button>
            
            <button
              onClick={downloadJSON}
              disabled={isDownloading}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1h10v1.586a1 1 0 01-.293.707l-4 4a1 1 0 01-1.414 0l-4-4A1 1 0 015 7.586V6z" clipRule="evenodd" />
              </svg>
              Download as JSON
            </button>
          </div>
          
          {isDownloading && (
            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Preparing download...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DownloadOptions;
