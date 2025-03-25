import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppsGrid } from "@/components/ui/apps-grid";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (file: File) => void;
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
  const { theme, setTheme } = useTheme();
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUrl('');
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files?.length) {
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setUrl('');
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
    if (event.target.value) {
      setFile(null);
    }
  };

  const handleGenerate = async () => {
    if (file) {
      onFileUpload(file);
      onClose();
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
      const proxyUrl = `/api/papermap/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        let errorMsg = "Cannot use this URL, please upload the PDF file directly";
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // If we can't parse the error, use the default message
        }
        throw new Error(errorMsg);
      }
      
      const blob = await response.blob();
      const fileName = url.split('/').pop() || 'document.pdf';
      const fileFromUrl = new File([blob], fileName, { type: 'application/pdf' });
      
      onFileUpload(fileFromUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Cannot use this URL, please upload the PDF file directly";
      setUrlError(errorMessage);
      console.error('Error fetching PDF:', err);
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
            <h2 className="text-xl font-semibold text-card-foreground">New Mindmap</h2>
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
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <p className="font-medium text-sm break-words max-w-full px-6" style={{ wordBreak: 'break-all' }}>{file.name.replace(/_/g, '_\u200B')}</p>
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
                <div className="text-destructive text-sm mt-1">
                  {urlError}
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || urlLoading || (!file && !url.trim())}
              variant={loading || urlLoading || (!file && !url.trim()) ? "neutral" : "default"}
              className="w-full"
            >
              {loading || urlLoading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </div>

          {error && (
            <div className="text-destructive text-sm mt-4 p-3 bg-destructive/10 rounded-base">
              {error.includes("[GoogleGenerativeAI Error]") 
                ? "AI service unavailable. Please try again later." 
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
                <Menu className="h-4 w-4" />
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
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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