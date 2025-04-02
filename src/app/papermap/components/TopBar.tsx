import { LoaderCircle, Menu, FileText, Plus } from 'lucide-react';
import Downloader from './Downloader';
import { useCallback } from 'react';
import Sidebar from './Sidebar';
import { Button } from "@/components/ui/button";
import { useMindMapContext, usePdfViewerContext, useUIStateContext } from '../context';

interface TopBarProps {
  onFileUpload: (file: File, blobUrl?: string) => void;
}

export default function TopBar({
  onFileUpload
}: TopBarProps) {
  // Get state from contexts
  const { 
    loading, 
    error, 
    loadExampleMindMap 
  } = useMindMapContext();
  
  const { fileName, openPdfViewer, handlePdfFile } = usePdfViewerContext();
  const { sidebarOpen, setSidebarOpen } = useUIStateContext();

  // Custom file upload handler
  const handleUpload = useCallback(async (file: File, blobUrl?: string) => {
    // Clear any previous errors
    // Process the PDF file for viewing
    await handlePdfFile(file, blobUrl);
    
    // Call original handler for mind map generation
    onFileUpload(file, blobUrl);
  }, [onFileUpload, handlePdfFile]);

  // Function to handle file name click and open PDF viewer
  const handleFileNameClick = () => {
    openPdfViewer(1); // Open to the first page
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
              <span className="sm:hidden"><Plus className="h-4 w-4" /></span>
              <span className="hidden sm:block"><Menu className="h-4 w-4" /></span>
              <span className="sm:inline hidden">New</span>
            </Button>
          </div>
          
          {/* Center - Status messages */}
          <div className="flex-1 text-center min-w-0">
            {loading && (
              <div className="flex items-center justify-center text-primary">
                <span>Creating Mindmap</span>
                <div className="flex items-center ml-1">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-[bounce_1s_ease-in-out_0s_infinite]"></div>
                  <div className="h-1.5 w-1.5 bg-primary rounded-full mx-0.5 animate-[bounce_1s_ease-in-out_0.2s_infinite]"></div>
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]"></div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-destructive">
                {error.includes("[GoogleGenerativeAI Error]") && error.includes("exceeds the supported page limit of 1000")
                  ? "PDF is too large. Please use a document with fewer than 1000 pages."
                  : error.includes("[GoogleGenerativeAI Error]") 
                    ? "AI service unavailable. Please try again later." 
                    : error.length > 60 
                      ? `${error.substring(0, 60)}...` 
                      : error
                }
              </div>
            )}

            {!loading && !error && (
              <div 
                className={`font-extrabold text-primary relative inline-flex items-center max-w-full cursor-pointer hover:text-blue-600 group`}
                onClick={handleFileNameClick}
                title="Click to open PDF"
              >
                <div className="group-hover:text-blue-600 mr-2">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="truncate">
                  {fileName !== 'mindmap' ? fileName : "Example: Steve Jobs' Stanford Commencement Speech"}
                </div>
              </div>
            )}
          </div>
          
          {/* Right side - Download button */}
          <div>
            <Downloader />
          </div>
        </div>
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onFileUpload={(file, blobUrl) => {
          handleUpload(file, blobUrl);
          setSidebarOpen(false);
        }}
        loading={loading}
        error={error}
        loadExampleMindMap={loadExampleMindMap}
      />
    </>
  );
} 