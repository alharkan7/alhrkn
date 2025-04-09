import { FileText, Plus, RefreshCw } from 'lucide-react';
import Downloader from './Downloader';
import { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useMindMapContext, usePdfViewerContext } from '../context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TopBarProps {
  onFileUpload: (file: File, blobUrl?: string) => void;
  onNewClick: () => void;
}

export default function TopBar({
  onFileUpload,
  onNewClick
}: TopBarProps) {
  // Get state from contexts
  const { 
    loading, 
    error, 
    loadExampleMindMap 
  } = useMindMapContext();
  
  const { fileName, openPdfViewer, handlePdfFile } = usePdfViewerContext();

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
    <div className="py-4 px-2 bg-muted/50 print:hidden">
      <div className="flex items-center justify-between gap-4 relative">
        {/* Left side - New button */}
        <div className="absolute left-0 z-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                className="flex items-center"
                title="New Mindmap"
              >
                <span className=""><RefreshCw className="h-4 w-4" /></span>
                <span className="sm:inline hidden">New</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create New Mindmap?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear your current mindmap.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onNewClick}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        {/* Center - Status messages */}
        <div className="flex-1 text-center min-w-0 mx-[72px] sm:mx-[85px]">
          {loading && (
            <div className="flex items-center justify-center text-primary">
              <span>Creating Mindmap</span>
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
        <div className="absolute right-0 z-10">
          <Downloader />
        </div>
      </div>
    </div>
  );
} 