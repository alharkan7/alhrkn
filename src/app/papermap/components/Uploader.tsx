import React, { useState } from 'react';

// Interface for the FileUploader props
interface UploaderProps {
  onFileUpload: (file: File) => void;
  loading: boolean;
  error: string | null;
}

const Uploader: React.FC<UploaderProps> = ({ onFileUpload, loading, error }) => {
  const [useUrl, setUseUrl] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    setUrlError(null);
  };

  const handleUrlSubmit = async () => {
    setUrlError(null);
    setUrlLoading(true);
    
    // Validate URL format
    if (!url.trim()) {
      setUrlError("Please enter a URL");
      setUrlLoading(false);
      return;
    }
    
    if (!url.trim().toLowerCase().endsWith('.pdf')) {
      setUrlError("URL must point to a PDF file");
      setUrlLoading(false);
      return;
    }
    
    try {
      // Use our proxy API endpoint to fetch the PDF
      const proxyUrl = `/api/papermap/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        // Try to get error message from response if available
        let errorMsg = "Cannot use this url, please upload the pdf file directly";
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
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileName = url.split('/').pop() || 'document.pdf';
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      // Call the upload handler with the file
      onFileUpload(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Cannot use this url, please upload the pdf file directly";
      setUrlError(errorMessage);
      console.error('Error fetching PDF:', err);
    } finally {
      setUrlLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 items-center">
        <button 
          type="button"
          onClick={() => setUseUrl(false)}
          className={`px-3 py-1 text-sm rounded-md ${!useUrl ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Upload File
        </button>
        <button 
          type="button"
          onClick={() => setUseUrl(true)}
          className={`px-3 py-1 text-sm rounded-md ${useUrl ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Use URL
        </button>
      </div>
      
      {!useUrl ? (
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="block text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Enter PDF URL"
            className="px-3 py-2 border rounded-md w-64"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={loading || urlLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center"
          >
            {urlLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : "Load PDF"}
          </button>
        </div>
      )}
      
      {urlError && (
        <div className="text-red-500 text-sm mt-1">
          {urlError}
        </div>
      )}
    </div>
  );
};

export default Uploader; 