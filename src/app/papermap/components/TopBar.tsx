import { LoaderCircle, Plus, FileText } from 'lucide-react';
import Downloader from './Downloader';
import { RefObject, useState } from 'react';
import { Node } from 'reactflow';
import { MindMapData } from './MindMapTypes';
import Sidebar from './Sidebar';
import { Button } from "@/components/ui/button";

interface TopBarProps {
  loading: boolean;
  error: string | null;
  nodes: Node[];
  mindMapData: MindMapData | null;
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  reactFlowInstance: RefObject<any>;
  fileName: string;
  onFileUpload: (file: File) => void;
  loadExampleMindMap?: () => void;
  openPdfViewer?: (pageNumber: number) => void;
}

export default function TopBar({
  loading,
  error,
  nodes,
  mindMapData,
  reactFlowWrapper,
  reactFlowInstance,
  fileName,
  onFileUpload,
  loadExampleMindMap,
  openPdfViewer
}: TopBarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Function to handle file name click and open PDF viewer
  const handleFileNameClick = () => {
    if (openPdfViewer && (fileName !== 'mindmap' || loadExampleMindMap)) {
      openPdfViewer(1); // Open to the first page
    }
  };

  return (
    <>
      <div className="p-2 bg-muted/50 print:hidden">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - New button */}
          <div>
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="default"
              className="flex items-center"
              title="New Mindmap"
            >
              <Plus className="h-4 w-4" />
              <span className="sm:inline hidden">New</span>
            </Button>
          </div>
          
          {/* Center - Status messages */}
          <div className="flex-1 text-center min-w-0">
            {loading && (
              <div className="flex items-center justify-center text-primary">
                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                <span>Creating Mindmap...</span>
              </div>
            )}

            {error && (
              <div className="text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div 
                className={`font-extrabold text-primary relative inline-flex items-center max-w-full ${openPdfViewer ? 'cursor-pointer hover:text-blue-600 group' : ''}`}
                onClick={handleFileNameClick}
                title={openPdfViewer ? "Click to open PDF" : ""}
              >
                <div className="truncate pr-6">
                  {fileName !== 'mindmap' ? fileName : "Example: Steve Jobs' Stanford Commencement Speech"}
                </div>
                {openPdfViewer && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-500 group-hover:text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right side - Download button */}
          <div>
            <Downloader
              nodes={nodes}
              mindMapData={mindMapData}
              reactFlowWrapper={reactFlowWrapper}
              reactFlowInstance={reactFlowInstance}
              fileName={fileName}
            />
          </div>
        </div>
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onFileUpload={(file) => {
          onFileUpload(file);
          setSidebarOpen(false);
        }}
        loading={loading}
        error={error}
        loadExampleMindMap={loadExampleMindMap}
      />
    </>
  );
} 