import React, { useState, useEffect } from 'react';
import { LoadingIcon, XIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (file: File) => void;
  loading: boolean;
  error: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onFileUpload, 
  loading, 
  error 
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [useUrl, setUseUrl] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);

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

  if (!isRendered) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex transition-opacity duration-300 ease-in-out"
      style={{ opacity: isAnimating ? 1 : 0 }}
      onClick={(e) => {
        // Close when clicking the overlay background
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`w-80 bg-white h-full shadow-lg p-6 transform transition-transform duration-300 ease-in-out ${isAnimating ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">New Mindmap</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 relative ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            {file ? (
              <div className="text-blue-600">
                <button
                  onClick={() => setFile(null)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-5 w-5" />
                </button>
                <p className="font-medium">{file.name}</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-500">Drop your PDF file here</p>
                <p className="text-gray-400 text-sm mt-1">or</p>
                <label className="mt-2 inline-block px-3 py-1.5 bg-blue-600 text-white rounded-md cursor-pointer text-sm">
                  Browse Files
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-gray-500 mb-2 text-center">- OR -</div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter PDF URL</label>
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              disabled={!!file}
              placeholder="https://example.com/paper.pdf"
              className={`w-full px-3 py-2 border rounded-md ${file ? 'bg-gray-100 text-gray-400' : ''}`}
            />
            {urlError && (
              <div className="text-red-500 text-sm mt-1">
                {urlError}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || urlLoading || (!file && !url.trim())}
            className={`w-full px-3 py-1.5 rounded-md text-white text-sm ${
              loading || urlLoading || (!file && !url.trim()) 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading || urlLoading ? (
              <span className="flex items-center justify-center">
                <LoadingIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Generating...
              </span>
            ) : (
              "Generate"
            )}
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-4 p-3 bg-red-50 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 