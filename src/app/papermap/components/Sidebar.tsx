import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Moon, Sun, LoaderCircle, X, Waypoints, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppsGrid } from "@/components/ui/apps-grid";

// Define file size limit constant - increased with Vercel Blob
const MAX_FILE_SIZE_MB = 25; // Maximum file size for PDF uploads
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (file: File, blobUrl?: string) => void;
  loading: boolean;
  error: string | null;
  loadExampleMindMap?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onFileUpload, 
  loading, 
  error,
  loadExampleMindMap
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [useUrl, setUseUrl] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const currentYear = new Date().getFullYear();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset states when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setUrl('');
      setUrlError(null);
      setUrlLoading(false);
      setUseUrl(false);
      setFileSizeError(null);
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  // Handle the animation states when isOpen changes
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to ensure DOM is ready before starting animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Check if file size is within limits
  const checkFileSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileSizeError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
      return false;
    }
    setFileSizeError(null);
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (checkFileSize(selectedFile)) {
        setFile(selectedFile);
        setUrl('');
      } else {
        setFile(null);
        // Keep the file selected in the input for better UX
        event.target.value = '';
      }
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files?.length) {
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        if (checkFileSize(droppedFile)) {
          setFile(droppedFile);
          setUrl('');
        }
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    setUrlError(null);
    setFileSizeError(null);
    if (event.target.value) {
      setFile(null);
    }
  };

  // Upload file to Vercel Blob storage
  const uploadFileToBlob = async (fileToUpload: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(10); // Start progress

      // Create FormData
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Upload to our blob API endpoint
      const response = await fetch('/api/papermap/blob-upload', {
        method: 'POST',
        body: formData,
      });

      // Update progress
      setUploadProgress(70);

      if (!response.ok) {
        // Check for 413 status code specifically (Request Entity Too Large)
        if (response.status === 413) {
          throw new Error(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        }
        
        // Check content-type before trying to parse as JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        } else {
          // For non-JSON responses, use text() instead
          const errorText = await response.text();
          // If the error text starts with "Request Entity Too Large" or contains size-related terms
          if (errorText.includes('Request Entity Too Large') || 
              errorText.includes('too large') || 
              errorText.includes('size exceeds')) {
            throw new Error(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
          }
          throw new Error('Failed to upload file: ' + (errorText.substring(0, 100) || response.statusText));
        }
      }

      const data = await response.json();
      setUploadProgress(100);
      
      return data.url;
    } catch (error) {
      console.error('Error uploading to Blob storage:', error);
      setUrlError(error instanceof Error ? error.message : 'Failed to upload file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Upload URL content to Vercel Blob storage
  const uploadUrlToBlob = async (pdfUrl: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(10); // Start progress
      
      // Call our URL-to-blob API endpoint
      const response = await fetch('/api/papermap/blob-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: pdfUrl }),
      });
      
      // Update progress
      setUploadProgress(70);
      
      if (!response.ok) {
        // Check for 413 status code specifically (Request Entity Too Large)
        if (response.status === 413) {
          throw new Error(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        }
        
        // Check content-type before trying to parse as JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          // Check if it's a size error but doesn't contain details
          if (errorData.error?.includes('too large') || errorData.error?.includes('size exceeds')) {
            throw new Error(errorData.error || `File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
          }
          throw new Error(errorData.error || 'Failed to process URL. Please upload the PDF file directly.');
        } else {
          // For non-JSON responses, use text() instead
          const errorText = await response.text();
          // If the error text starts with "Request Entity Too Large" or contains size-related terms
          if (errorText.includes('Request Entity Too Large') || 
              errorText.includes('too large') || 
              errorText.includes('size exceeds')) {
            throw new Error(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
          }
          // For generic 400 errors without specific error text
          if (response.status === 400) {
            throw new Error(`The PDF file may be too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
          }
          throw new Error('Failed to process URL: ' + (errorText.substring(0, 100) || response.statusText));
        }
      }
      
      const data = await response.json();
      setUploadProgress(100);
      
      return data.url;
    } catch (error) {
      // Don't log to console if it's a file size error to avoid cluttering the console
      if (!(error instanceof Error && 
          (error.message.includes('too large') || error.message.includes('size exceeds')))) {
        console.error('Error processing URL:', error);
      }
      
      // Enhance file size error messages to include limit if not already mentioned
      if (error instanceof Error) {
        // Check for generic error messages and replace with helpful size info
        if (error.message === 'Failed to process URL' || 
            error.message.includes('Failed to process URL.')) {
          setUrlError(`The PDF file may be too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        }
        else if ((error.message.includes('too large') || error.message.includes('size exceeds')) 
            && !error.message.includes(`${MAX_FILE_SIZE_MB} MB`)) {
          setUrlError(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        } else {
          setUrlError(error.message);
        }
      } else {
        setUrlError(`Failed to process URL. The PDF file may be too large (maximum ${MAX_FILE_SIZE_MB} MB).`);
      }
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (file) {
      // Upload file to Vercel Blob first
      const blobUrl = await uploadFileToBlob(file);
      
      if (blobUrl) {
        // Pass both the file and the blob URL
        onFileUpload(file, blobUrl);
        onClose();
      }
      return;
    }
    
    if (!url.trim()) {
      setUrlError("Please enter a URL");
      return;
    }
    
    setUrlError(null);
    setUrlLoading(true);
    
    if (!url.trim().toLowerCase().endsWith('.pdf')) {
      setUrlError("URL must point to a PDF file");
      setUrlLoading(false);
      return;
    }
    
    try {
      // Upload URL to Vercel Blob
      const blobUrl = await uploadUrlToBlob(url);
      
      if (!blobUrl) {
        throw new Error(`Failed to process URL. The PDF file may be too large (maximum ${MAX_FILE_SIZE_MB} MB).`);
      }
      
      // Fetch from our blob URL to create a file object
      const response = await fetch(blobUrl);
      
      if (!response.ok) {
        throw new Error("Failed to retrieve file from storage");
      }
      
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileName = url.split('/').pop() || 'document.pdf';
      const fileFromUrl = new File([blob], fileName, { type: 'application/pdf' });
      
      // Pass both the file and blob URL to the handler
      onFileUpload(fileFromUrl, blobUrl);
      onClose();
    } catch (err) {
      // Improved error handling with more specific messages
      let errorMessage = `The PDF file may be too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`;
      
      if (err instanceof Error) {
        // Handle file size errors consistently with direct uploads
        if (err.message.includes('too large') || err.message.includes('size exceeds')) {
          // If the error doesn't include the size limit, add it
          if (!err.message.includes(`${MAX_FILE_SIZE_MB} MB`)) {
            errorMessage = `File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`;
          } else {
            errorMessage = err.message;
          }
        } else if (err.message.includes('not point to a valid PDF')) {
          errorMessage = "The URL does not point to a valid PDF file";
        } else if (err.message.includes('Failed to fetch PDF')) {
          errorMessage = "Could not download the PDF. Please ensure the URL is accessible.";
        } else if (err.message.includes('Failed to process URL')) {
          // Keep our default error message about file size
          errorMessage = `The PDF file may be too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      setUrlError(errorMessage);
      // Only log to console if it's not a file size error
      if (!errorMessage.includes('too large') && !errorMessage.includes('size exceeds')) {
        console.error('Error fetching PDF:', err);
      }
    } finally {
      setUrlLoading(false);
    }
  };

  const handleLoadExample = () => {
    if (loadExampleMindMap) {
      loadExampleMindMap();
      onClose();
    }
  };

  // Determine if the Create button should be disabled
  const isCreateButtonDisabled = loading || 
                               urlLoading || 
                               isUploading ||
                               (!file && !url.trim()) || 
                               !!fileSizeError;

  if (!isRendered) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex transition-opacity duration-300 ease-in-out"
      style={{ opacity: isAnimating ? 1 : 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`w-80 bg-card h-full shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out ${isAnimating ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Waypoints className="h-5 w-5 mr-1" />
              New Mindmap
            </h3>
            <Button
              variant="neutral"
              size="icon"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="mb-6">
            <div 
              className={`border-2 bg-muted/50 rounded-base p-8 text-center mb-4 relative ${file ? 'border-primary bg-primary/10' : 'border-border'}`}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
            >
              {file ? (
                <div className="text-primary">
                  <Button
                    variant="neutral"
                    size="icon"
                    onClick={() => {
                      setFile(null);
                      setFileSizeError(null);
                    }}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <p className="font-medium text-sm break-words max-w-full px-6" style={{ wordBreak: 'break-all' }}>{file.name.replace(/_/g, '_\u200B')}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground text-sm">Drop your file here</p>
                  <Button
                    variant="default"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </Button>
                </div>
              )}
            </div>

            {fileSizeError && (
              <div className="text-destructive text-sm mb-4 p-3 bg-destructive/10 rounded-base flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{fileSizeError}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Or Enter a URL</label>
              <Input
                type="text"
                value={url}
                onChange={handleUrlChange}
                disabled={!!file}
                placeholder="https://example.com/paper.pdf"
                className={file ? 'bg-muted text-muted-foreground' : ''}
              />
              {urlError && (
                <div className="text-destructive text-sm mt-1 p-3 bg-destructive/10 rounded-base flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{urlError}</span>
                </div>
              )}
            </div>

            {/* Upload progress bar */}
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isCreateButtonDisabled}
              variant={isCreateButtonDisabled ? "neutral" : "default"}
              className="w-full"
            >
              {loading || urlLoading || isUploading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  {isUploading ? 'Reading...' : 'Mapping...'}
                </>
              ) : (
                "Create"
              )}
            </Button>

          </div>

          {error && (
            <div className="text-destructive text-sm mt-4 p-3 bg-destructive/10 rounded-base">
              {error.includes("[GoogleGenerativeAI Error]") 
                ? "AI service unavailable. Please try again later." 
                : error.includes("File is too large") || error.includes("too large") || error.includes("size exceeds")
                  ? `The AI cannot process this large file. Please upload a smaller PDF.`
                : error.length > 60 
                  ? `${error.substring(0, 60)}...` 
                  : error
              }
            </div>
          )}

        </div>

        <div className="mt-auto px-6 mb-6">
          <AppsGrid
            trigger={
              <Button variant="neutral" className="w-full flex items-center justify-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span>More Apps</span>
              </Button>
            }
          />
        </div>

        <footer className="py-1 text-center text-sm text-muted-foreground pb-3">
          <p className="flex flex-wrap items-center justify-center relative">
            <span className="flex-grow flex items-center justify-center">
              &copy; {currentYear}&nbsp;
            </span>
            <Button
              variant="default"
              size="icon"
              className="absolute right-2 rounded-full -top-4"
              onClick={() => {
                const html = document.documentElement;
                html.classList.toggle('dark');
              }}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Sidebar; 