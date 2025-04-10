import { FileText, Plus, RefreshCw, MessageSquare, ExternalLink } from 'lucide-react';
import Downloader from './Downloader';
import { useCallback, useEffect, useState } from 'react';
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
  onFileUpload: (file: File | { text: string, isTextInput?: boolean }, blobUrl?: string) => void;
  onNewClick: () => void;
  inputType: 'pdf' | 'text' | null;
}

export default function TopBar({
  onFileUpload,
  onNewClick,
  inputType
}: TopBarProps) {
  // Get state from contexts
  const { 
    loading, 
    error, 
    loadExampleMindMap 
  } = useMindMapContext();
  
  const { fileName, openPdfViewer, handlePdfFile } = usePdfViewerContext();
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  // Load sourceUrl from localStorage when component mounts
  useEffect(() => {
    const url = localStorage.getItem('sourceUrl');
    if (url) {
      setSourceUrl(url);
    } else {
      setSourceUrl(null);
    }
  }, [fileName]); // Re-check when filename changes

  // Custom file upload handler for PDF files
  const handleUpload = useCallback(async (file: File, blobUrl?: string) => {
    // Process the PDF file for viewing first
    await handlePdfFile(file, blobUrl);
    
    // Then call the parent handler for mind map generation
    // Make sure we're passing the file as a File object, not as text
    onFileUpload(file, blobUrl);
  }, [onFileUpload, handlePdfFile]);

  // Function to handle file name click and open PDF viewer
  const handleFileNameClick = () => {
    if (inputType === 'pdf') {
      openPdfViewer(1); // Open to the first page
    }
  };

  // Function to handle URL click and open in new tab
  const handleUrlClick = () => {
    if (sourceUrl) {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Determine if the title is a URL (starts with "URL:")
  const isUrl = fileName?.startsWith('URL:');

  return (
    <div className="sticky top-0 py-4 px-2 bg-muted/50 backdrop-blur-sm print:hidden z-50 overscroll-none">
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
              className={`font-extrabold text-primary relative inline-flex items-center max-w-[calc(100%-2rem)] ${
                inputType === 'pdf' || isUrl ? 'cursor-pointer hover:text-blue-600 group' : ''
              }`}
              onClick={
                inputType === 'pdf' 
                  ? handleFileNameClick 
                  : isUrl && sourceUrl 
                    ? handleUrlClick 
                    : undefined
              }
              title={
                inputType === 'pdf' 
                  ? "Click to open PDF" 
                  : isUrl && sourceUrl 
                    ? "Click to open URL in new tab" 
                    : ""
              }
            >
              <div className={`${inputType === 'pdf' || isUrl ? "group-hover:text-blue-600 mr-2" : "mr-2"}`}>
                {inputType === 'pdf' ? (
                  <FileText className="h-4 w-4" />
                ) : isUrl ? (
                  <ExternalLink className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </div>
              <div className="truncate max-w-full">
                {inputType === 'pdf' 
                  ? (fileName !== 'mindmap' ? fileName : "Example: Steve Jobs' Stanford Commencement Speech")
                  : (fileName || "Topic Mindmap")
                }
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