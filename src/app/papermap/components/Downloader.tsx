import React, { useState, useRef, useEffect } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download,FileImage, FileText, Braces, List } from 'lucide-react';
import { getNodesBounds, getTransformForBounds } from 'reactflow';
import { Button } from "@/components/ui/button";
import { useMindMapContext, usePdfViewerContext } from '../context';

interface DownloaderProps {
  // No props needed anymore as we'll use context
}

export default function Downloader({}: DownloaderProps) {
  const { nodes, mindMapData, reactFlowWrapper, reactFlowInstance } = useMindMapContext();
  const { fileName } = usePdfViewerContext();
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

    // Check if dark mode is active
    const isDarkMode = document.documentElement.classList.contains('dark');
    
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
          background: exportType === 'image' ? 'transparent' : isDarkMode ? '#020817' : '#ffffff',
        },
        filter: (node: any) => {
          return (
            !node.classList?.contains('react-flow__minimap') &&
            !node.classList?.contains('react-flow__controls') &&
            !(node.getAttribute && node.getAttribute('data-exclude-from-export') === 'true')
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
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toJpeg(viewportElement, {
        quality: 0.95,
        backgroundColor: isDarkMode ? '#020817' : '#ffffff',
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
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toPng(viewportElement, {
        quality: 1,
        backgroundColor: 'transparent',
        ...exportOptions,
        style: {
          ...exportOptions.style,
          background: 'transparent',
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
    const exportData = prepareExport('pdf');
    if (!exportData) return;

    const { viewportElement, exportOptions } = exportData;
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Small delay to ensure the view is updated
    setTimeout(() => {
      toPng(viewportElement, {
        quality: 0.8, // Reduced quality for better compression
        backgroundColor: isDarkMode ? '#020817' : '#ffffff',
        ...exportOptions
      })
        .then((dataUrl) => {
          // Create PDF with dimensions based on the image
          const img = new Image();
          img.src = dataUrl;

          img.onload = () => {
            // Convert pixel dimensions to points (1/72 inch)
            // 1 pixel = 1/96 inch, 1 point = 1/72 inch
            // Therefore, 1 pixel = 72/96 points ≈ 0.75 points
            const pointsPerPixel = 72/96;
            const widthInPoints = img.width * pointsPerPixel;
            const heightInPoints = img.height * pointsPerPixel;

            // Create PDF with point-based dimensions
            const pdf = new jsPDF({
              orientation: img.width > img.height ? 'landscape' : 'portrait',
              unit: 'pt',
              format: [widthInPoints, heightInPoints]
            });

            // Add the image with compression
            pdf.addImage(dataUrl, 'PNG', 0, 0, widthInPoints, heightInPoints, undefined, 'FAST');
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

  // Generate and download as bullet point list
  const downloadAsBulletList = () => {
    if (!mindMapData || !mindMapData.nodes.length) return;

    // Create a map of parent ID to child nodes for easier traversal
    const nodeMap = new Map<string | null, Array<typeof mindMapData.nodes[0]>>();
    
    // Group nodes by their parent
    mindMapData.nodes.forEach(node => {
      if (!nodeMap.has(node.parentId)) {
        nodeMap.set(node.parentId, []);
      }
      nodeMap.get(node.parentId)?.push(node);
    });
    
    // Generate the bullet point text
    let bulletText = "";
    let lastLevel = -1; // Track the level of the last processed node
    
    // Function to recursively generate bullet points
    const generateBulletPoints = (nodeId: string | null, level: number = 0) => {
      const nodes = nodeMap.get(nodeId) || [];
      
      // Sort nodes if needed (you can sort by ID, title, or any other property)
      nodes.sort((a, b) => a.level - b.level);
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Add a blank line in these cases:
        // 1. When we're not at the first node overall
        // 2. When the current level is different from the last processed level (moving up or down levels)
        // 3. When we're at the same level but not the first node in a group of siblings
        if (bulletText.length > 0 && (level !== lastLevel || i > 0)) {
          bulletText += "\n";
        }
        
        // Create indentation based on level
        const indent = "  ".repeat(level);
        
        // Add the bullet point line with center dot "•" instead of dash "-"
        bulletText += `${indent}• ${node.title}: ${node.description}\n`;
        
        // Save the current level before recursing
        lastLevel = level;
        
        // Process children recursively
        generateBulletPoints(node.id, level + 1);
      }
    };
    
    // Start with root nodes (nodes with null parentId)
    generateBulletPoints(null);
    
    // Create a blob and download
    const dataBlob = new Blob([bulletText], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_mindmap.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (nodes.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="default"
        className="flex items-center"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Download"
      >
        <Download className="h-4 w-4" />
        <span className="sm:inline hidden">Download</span>
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-[100px] bg-card rounded-md shadow-lg z-10 border border-border">
          <ul className="py-1">
            <li key="jpeg">
              <button
                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                onClick={() => {
                  downloadAsJpeg();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <FileImage className="mr-2 h-4 w-4" />
                  JPEG
                </div>
              </button>
            </li>
            <li key="png">
              <button
                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                onClick={() => {
                  downloadAsPng();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <FileImage className="mr-2 h-4 w-4" />
                  PNG
                </div>
              </button>
            </li>
            <li key="pdf">
              <button
                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                onClick={() => {
                  downloadAsPdf();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </div>
              </button>
            </li>
            <li key="txt">
              <button
                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                onClick={() => {
                  downloadAsBulletList();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <List className="mr-2 h-4 w-4" />
                  Text
                </div>
              </button>
            </li>
            <li key="json">
              <button
                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                onClick={() => {
                  downloadAsJSON();
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center">
                  <Braces className="mr-2 h-4 w-4" />
                  JSON
                </div>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
} 