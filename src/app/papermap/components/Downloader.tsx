import React, { useState, useRef, useEffect } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { DownloadIcon, ImageIcon, DocumentIcon, CodeIcon } from './Icons';
import { getNodesBounds, getTransformForBounds } from 'reactflow';

interface DownloaderProps {
  nodes: any[];
  mindMapData: any;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  reactFlowInstance: React.MutableRefObject<any>;
  fileName: string;
}

const Downloader: React.FC<DownloaderProps> = ({
  nodes,
  mindMapData,
  reactFlowWrapper,
  reactFlowInstance,
  fileName,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to prepare the flow for image export
  const prepareExport = (exportType: 'image' | 'pdf') => {
    if (!reactFlowInstance.current || !nodes.length || !reactFlowWrapper.current) return null;

    // Calculate bounds for all nodes - using nodes passed through props
    const nodesBounds = getNodesBounds(nodes);
    
    // Add some padding to the bounds
    const padding = 50;
    const imageWidth = nodesBounds.width + padding * 2;
    const imageHeight = nodesBounds.height + padding * 2;
    
    // Calculate transform to ensure all nodes are visible
    const transform = getTransformForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5, // minZoom
      2    // maxZoom
    );
    
    // Get the viewport element for export
    const viewportElement = reactFlowWrapper.current!.querySelector('.react-flow__viewport') as HTMLElement;
    
    // Return necessary information
    return {
      viewportElement,
      exportOptions: {
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
        },
        filter: (node: any) => {
          return (
            !node.classList?.contains('react-flow__minimap') &&
            !node.classList?.contains('react-flow__controls')
          );
        }
      }
    };
  };

  // Download as JPEG
  const downloadAsJpeg = () => {
    const exportData = prepareExport('image');
    if (!exportData) return;

    const { viewportElement, exportOptions } = exportData;

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toJpeg(viewportElement, {
        quality: 0.95,
        backgroundColor: '#f8fafc',
        ...exportOptions
      })
        .then((dataUrl) => {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${fileName}_mindmap.jpeg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        })
        .catch((error) => {
          console.error('Error generating JPEG:', error);
        });
    }, 300);
  };

  // Download as PNG with transparent background
  const downloadAsPng = () => {
    const exportData = prepareExport('image');
    if (!exportData) return;

    const { viewportElement, exportOptions } = exportData;

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toPng(viewportElement, {
        quality: 1,
        backgroundColor: 'transparent',
        ...exportOptions
      })
        .then((dataUrl) => {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${fileName}_mindmap.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        })
        .catch((error) => {
          console.error('Error generating PNG:', error);
        });
    }, 300);
  };

  // Download as PDF
  const downloadAsPdf = () => {
    const exportData = prepareExport('pdf');
    if (!exportData) return;

    const { viewportElement, exportOptions } = exportData;

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toPng(viewportElement, {
        quality: 1,
        backgroundColor: '#ffffff',
        ...exportOptions
      })
        .then((dataUrl) => {
          // Create PDF with dimensions based on the image
          const img = new Image();
          img.src = dataUrl;

          img.onload = () => {
            // Use image dimensions for PDF
            const pdf = new jsPDF({
              orientation: img.width > img.height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [img.width, img.height]
            });

            // Add the image at full size
            pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
            pdf.save(`${fileName}_mindmap.pdf`);
          };
        })
        .catch((error) => {
          console.error('Error generating PDF:', error);
        });
    }, 300);
  };

  const downloadAsJSON = () => {
    if (!mindMapData) return;

    const dataStr = JSON.stringify(mindMapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_mindmap.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (nodes.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center text-sm"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <DownloadIcon className="mr-1.5 text-white h-4 w-4" />
        <span>Download</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-30 bg-white rounded-md shadow-lg z-10">
          <ul className="py-1">
            <li key="jpeg">
              <button
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-blue-100"
                onClick={() => {
                  downloadAsJpeg();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <ImageIcon className="mr-2" />
                  JPEG
                </div>
              </button>
            </li>
            <li key="png">
              <button
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-blue-100"
                onClick={() => {
                  downloadAsPng();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <ImageIcon className="mr-2" />
                  PNG
                </div>
              </button>
            </li>
            <li key="pdf">
              <button
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-blue-100"
                onClick={() => {
                  downloadAsPdf();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <DocumentIcon className="mr-2" />
                  PDF
                </div>
              </button>
            </li>
            <li key="json">
              <button
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-blue-100"
                onClick={() => {
                  downloadAsJSON();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <CodeIcon className="mr-2" />
                  JSON
                </div>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Downloader; 