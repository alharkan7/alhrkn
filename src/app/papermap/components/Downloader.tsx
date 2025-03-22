import React, { useState, useRef, useEffect } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { DownloadIcon, ChevronDownIcon } from './Icons';

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
  const prepareExport = () => {
    if (!reactFlowInstance.current || !nodes.length || !reactFlowWrapper.current) return null;

    // First fit the view to ensure everything is visible
    reactFlowInstance.current.fitView({ padding: 0.2 });

    // Return the viewport element
    return reactFlowWrapper.current!.querySelector('.react-flow__viewport') as HTMLElement;
  };

  // Download as JPEG
  const downloadAsJpeg = () => {
    const reactFlowNode = prepareExport();
    if (!reactFlowNode) return;

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toJpeg(reactFlowNode, {
        quality: 0.95,
        backgroundColor: '#f8fafc',
        style: {
          width: '100%',
          height: '100%'
        },
        filter: (node) => {
          return (
            !node.classList?.contains('react-flow__minimap') &&
            !node.classList?.contains('react-flow__controls')
          );
        }
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
    const reactFlowNode = prepareExport();
    if (!reactFlowNode) return;

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toPng(reactFlowNode, {
        quality: 1,
        backgroundColor: 'transparent',
        style: {
          width: '100%',
          height: '100%'
        },
        filter: (node) => {
          return (
            !node.classList?.contains('react-flow__minimap') &&
            !node.classList?.contains('react-flow__controls')
          );
        }
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
    const reactFlowNode = prepareExport();
    if (!reactFlowNode) return;

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toPng(reactFlowNode, {
        quality: 1,
        backgroundColor: '#ffffff',
        style: {
          width: '100%',
          height: '100%'
        },
        filter: (node) => {
          return (
            !node.classList?.contains('react-flow__minimap') &&
            !node.classList?.contains('react-flow__controls')
          );
        }
      })
        .then((dataUrl) => {
          // Create PDF with dimensions based on the image
          const img = new Image();
          img.src = dataUrl;

          img.onload = () => {
            // Use image dimensions instead of A4 paper size
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
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <DownloadIcon className="mr-2" />
        <span>Download</span>
        <ChevronDownIcon className="ml-2" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <ul className="py-1">
            <li key="jpeg">
              <button
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-blue-100"
                onClick={() => {
                  downloadAsJpeg();
                  setShowDropdown(false);
                }}
              >
                Download as JPEG
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
                Download as PNG (transparent)
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
                Download as PDF
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
                Download as JSON
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Downloader; 